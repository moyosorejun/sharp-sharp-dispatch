/* ---------------------------------------------------------------
   Live engine: a real browser call to Ada through the Vapi Web SDK.
   - SDK events drive the orb (speech-start/end, volume levels).
   - Transcript bubbles, one per speaker turn:
       caller: `transcript` messages (final ones merged, partials
               shown as a live typing line in the same bubble).
       Ada:    the text she generated, not her transcribed audio:
               `model-output` tokens grouped by turnId, with
               `conversation-update` filling in anything model-output
               never sent (e.g. the firstMessage greeting).
   - check_order tool calls (or an order number heard in the
     transcript) load the order card from GET /api/orders/:id.
   - While the call is live, GET /api/calls/:id/turns is polled every
     1.5s for confusion scores, ladder levels and escalations.
   --------------------------------------------------------------- */
import { api, ApiError } from '../lib/api';
import type { Engine, EngineContext, Escalation, Lang, Order, Speaker, Turn } from './types';

type VapiMessage = {
  type?: string;
  role?: 'user' | 'assistant';
  transcriptType?: 'partial' | 'final';
  transcript?: string;
  toolCallList?: { id?: string; function?: { name?: string; arguments?: unknown } }[];
  // model-output: one streamed token (string) or tool-call data, grouped by turnId
  turnId?: string;
  output?: unknown;
  // conversation-update
  messagesOpenAIFormatted?: { role?: string; content?: unknown }[];
};

type Bubble = { id: string; speaker: Speaker; text: string; partial: string; said: string; lang?: Lang; turn?: number };

function parseArgs<T>(raw: unknown): T | null {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  return raw && typeof raw === 'object' ? (raw as T) : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** A model-output token, or null when the output is a tool call. */
function tokenOf(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object' && typeof (output as { content?: unknown }).content === 'string') {
    return (output as { content: string }).content;
  }
  return null;
}

const POLL_MS = 1500;

export function createVapiEngine(ctx: EngineContext, publicKey: string, assistantId: string): Engine {
  // `any` because the SDK class is loaded lazily, so its bundle stays off the landing page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vapi: any = null;
  let pollTimer: number | undefined;
  let callId: string | null = null;
  let stopped = false;
  let lineNo = 0;
  let speaking = false;
  let lastOrderId: string | null = null;
  let pollFailures = 0;

  /* ---- bubbles: one per speaker turn ---- */
  let current: Bubble | null = null;
  let adaTurnId: string | null = null; // last model-output turn appended to the current Ada bubble
  const adaTurnText = new Map<string, string>(); // turnId -> generated text
  let assistantSeen = 0; // assistant messages already checked in conversation-update
  let lastCaller: Bubble | null = null; // newest caller bubble with committed text
  let logTurns = 0; // log_turn calls seen; the nth one is row n of the turns table
  const seenToolCalls = new Set<string>();

  const show = (b: Bubble) =>
    ctx.dispatch({
      type: 'line',
      line: {
        id: b.id, speaker: b.speaker, text: b.text, partial: b.partial || undefined, final: !b.partial,
        said: b.said || undefined, lang: b.lang, turn: b.turn,
      },
    });

  const bubbleFor = (speaker: Speaker): Bubble => {
    if (current && current.speaker === speaker) return current;
    // the other speaker took over: drop any half-heard partial left in the old bubble
    if (current?.partial) {
      current.partial = '';
      show(current);
    }
    current = { id: `v${++lineNo}`, speaker, text: '', partial: '', said: '' };
    adaTurnId = null;
    return current;
  };

  const appendText = (b: Bubble, text: string) => {
    const t = text.trim();
    if (t) b.text = b.text ? `${b.text} ${t}` : t;
  };
  const appendSaid = (b: Bubble, text: string) => {
    const t = text.trim();
    if (t) b.said = b.said ? `${b.said} ${t}` : t;
  };

  const loadOrder = async (raw: unknown) => {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (!digits) return;
    const id = `SSD-${digits}`;
    if (id === lastOrderId) return;
    lastOrderId = id;
    ctx.dispatch({ type: 'order', order: { kind: 'loading', id } });
    try {
      const order = await api<Order>(`/orders/${id}`);
      ctx.dispatch({ type: 'order', order: { kind: 'found', order } });
    } catch (e) {
      ctx.dispatch({ type: 'order', order: e instanceof ApiError && e.status === 404 ? { kind: 'missing', id } : { kind: 'error', id } });
    }
  };

  const poll = async () => {
    if (!callId) return;
    try {
      const data = await api<{ turns: Turn[]; escalations: Escalation[] }>(`/calls/${encodeURIComponent(callId)}/turns`);
      ctx.dispatch({ type: 'turns', turns: data.turns });
      ctx.dispatch({ type: 'escalations', escalations: data.escalations });
      if (pollFailures) ctx.dispatch({ type: 'dataError', value: false });
      pollFailures = 0;
    } catch {
      pollFailures += 1;
      if (pollFailures === 3) ctx.dispatch({ type: 'dataError', value: true });
    }
  };

  const onMessage = (m: VapiMessage) => {
    // Caller only: Ada's own transcript is her audio heard back, so it is ignored.
    if (m.type === 'transcript' && m.role === 'user' && m.transcript) {
      const final = m.transcriptType === 'final';
      const b = bubbleFor('caller');
      if (final) {
        appendText(b, m.transcript);
        b.partial = '';
        lastCaller = b;
      } else {
        b.partial = m.transcript;
      }
      show(b);
      if (final) {
        if (!speaking) ctx.dispatch({ type: 'status', status: 'thinking' });
        // Fallback for the order card: an order number said out loud
        const heard = m.transcript.match(/\b(?:ssd[\s-]*)?(1\d{3})\b/i);
        if (heard) loadOrder(heard[1]);
      }
    }
    // Ada: the text the model generated, streamed token by token
    if (m.type === 'model-output') {
      const token = tokenOf(m.output);
      if (token) {
        const turnId = m.turnId ?? 'turn';
        const b = bubbleFor('ada');
        if (adaTurnId !== turnId && b.text && !/\s$/.test(b.text) && !/^\s/.test(token)) b.text += ' ';
        b.text += b.text ? token : token.trimStart();
        adaTurnId = turnId;
        adaTurnText.set(turnId, (adaTurnText.get(turnId) ?? '') + token);
        show(b);
      }
    }
    // Ada: anything model-output never sent (the firstMessage greeting, for one)
    if (m.type === 'conversation-update' && m.messagesOpenAIFormatted) {
      const said = m.messagesOpenAIFormatted
        .filter((x) => x.role === 'assistant' && typeof x.content === 'string' && x.content.trim())
        .map((x) => x.content as string);
      for (let i = assistantSeen; i < said.length; i++) {
        const n = norm(said[i]);
        const covered = [...adaTurnText.values()].some((t) => {
          const tn = norm(t);
          return tn !== '' && (tn.includes(n) || n.includes(tn));
        });
        if (!covered) {
          const b = bubbleFor('ada');
          appendText(b, said[i]);
          show(b);
        }
      }
      assistantSeen = said.length;
    }
    if (m.type === 'tool-calls') {
      for (const call of m.toolCallList ?? []) {
        if (call.id) {
          if (seenToolCalls.has(call.id)) continue;
          seenToolCalls.add(call.id);
        }
        const name = call.function?.name;
        if (name === 'check_order') {
          const args = parseArgs<{ order_id?: string }>(call.function?.arguments);
          if (args) loadOrder(args.order_id);
        }
        // log_turn describes the caller's latest message: attach Ada's
        // correctly spelled version, the language and the turn row to it
        if (name === 'log_turn') {
          const args = parseArgs<{ caller_said?: string; language?: Lang }>(call.function?.arguments);
          const turn = logTurns++;
          if (lastCaller) {
            if (args?.caller_said) appendSaid(lastCaller, args.caller_said);
            if (args?.language) lastCaller.lang = args.language;
            lastCaller.turn = turn; // a merged bubble shows its latest turn's chips
            show(lastCaller);
          }
        }
      }
      poll();
    }
  };

  const finish = () => {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = undefined;
    ctx.volume.caller = 0;
    ctx.volume.ada = 0;
    // one last fetch: the final log_turn can land just after the call ends
    window.setTimeout(poll, 2000);
  };

  return {
    async start() {
      stopped = false;
      ctx.dispatch({ type: 'status', status: 'connecting' });
      try {
        const { default: Vapi } = await import('@vapi-ai/web');
        vapi = new Vapi(publicKey);
        vapi.on('call-start', () => ctx.dispatch({ type: 'status', status: 'listening' }));
        vapi.on('speech-start', () => {
          speaking = true;
          ctx.dispatch({ type: 'status', status: 'speaking' });
        });
        vapi.on('speech-end', () => {
          speaking = false;
          ctx.volume.ada = 0;
          ctx.dispatch({ type: 'status', status: 'listening' });
        });
        vapi.on('volume-level', (v: number) => { ctx.volume.ada = v; });
        // Listening for this starts the SDK's mic level observer
        vapi.on('local-volume-level', (v: number) => { ctx.volume.caller = v; });
        vapi.on('message', onMessage);
        vapi.on('call-end', () => {
          finish();
          ctx.dispatch({ type: 'status', status: 'ended' });
        });
        vapi.on('error', (e: unknown) => {
          console.error('Vapi error', e);
          const text = JSON.stringify(e ?? '');
          const mic = /NotAllowed|Permission|microphone/i.test(text);
          ctx.dispatch({ type: 'error', error: mic ? 'Abeg allow your mic so Ada fit hear you.' : 'Something no work. Abeg try again.', micBlocked: mic });
        });

        const call = await vapi.start(assistantId);
        if (stopped) return;
        if (!call?.id) throw new Error('No call id');
        callId = call.id;
        ctx.dispatch({ type: 'callId', id: call.id });
        pollTimer = window.setInterval(poll, POLL_MS);
      } catch (e) {
        console.error(e);
        const mic = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'NotFoundError');
        ctx.dispatch({ type: 'error', error: mic ? 'Abeg allow your mic so Ada fit hear you.' : 'Something no work. Abeg try again.', micBlocked: mic });
      }
    },
    stop() {
      stopped = true;
      finish();
      vapi?.stop();
    },
  };
}
