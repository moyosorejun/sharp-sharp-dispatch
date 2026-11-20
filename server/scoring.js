// ---------------------------------------------------------------
// Confusion scoring, off Ada's critical path.
//
// Ada used to call a log_turn tool before every reply, which cost an
// extra model round trip per turn and caused mid-sentence freezes. Now
// the server scores each caller turn itself: Vapi sends a
// conversation-update whenever a message is added, and once Ada has
// replied to a caller turn, that turn (plus Ada's reply) goes to a fast
// model on Groq. Seeing Ada's reply means the logged ladder level is
// what she actually did, not what she planned.
//
// A "turn" is every caller message between two Ada replies, the same
// grouping the live transcript uses for its bubbles, so turn n lines up
// with caller bubble n.
// ---------------------------------------------------------------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const SIGNALS = [
  'pidgin_confusion_phrase',
  'english_confusion_phrase',
  'repeated_question',
  'wrong_paraphrase',
  'short_unsure_reply',
  'frustration',
  'asked_for_human',
];

const RUBRIC = `You score one caller turn from a customer support phone call to Sharp Sharp Dispatch, a Lagos delivery company. The agent is Ada. Callers speak Nigerian Pidgin, English, or a mix.

Return ONLY a JSON object with these keys:
- "caller_said": the caller's words from CALLER TURN, word for word, with correct spelling. Speech recognition mishears Pidgin ("a beg" for abeg, "what in" for wetin, "they" for dey); fix misheard words using the conversation for context, and write Pidgin in standard Nigerian Pidgin spelling (abeg, wetin, dey, sabi, wahala, comot, oya, una, wey, na, sef, sha, abi, shey, ehn). Do not translate, summarise or add words.
- "language": "english", "pidgin" or "mixed".
- "confusion_score": integer 0-3.
    0 clear: understood and moved on. A new question, a request ("you fit reduce am?"), disagreement, small talk or a plain "okay" after a clear answer is 0.
    1 slightly unsure: short unsure replies like "okay..." or "hmm", or a small follow-up question about what Ada just explained.
    2 confused: confusion phrases ("wetin you talk?", "I no get am", "I no understand", "abeg explain am again", "how you mean?", "ehn?", "come again?", "I don't get it", "what does that mean?"), asking the same thing again, or repeating Ada's explanation back wrongly.
    3 lost or frustrated: confused again right after an earlier confused turn, frustration ("this thing no make sense", "I don tire", "just tell me"), or asking for a person.
- "ladder_level": integer 0-3, the explanation style of ADA'S REPLY: 0 normal direct answer, 1 broke it into small steps and checked ("You dey follow?"), 2 used an everyday analogy (bus park, danfo, market...), 3 offered or arranged a human agent.
- "signals": array using only these labels: ${SIGNALS.join(', ')}. Empty if none.`;

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function textOf(m) {
  if (typeof m?.content === 'string') return m.content.trim();
  if (Array.isArray(m?.content)) return m.content.map((c) => c?.text ?? '').join(' ').trim();
  return '';
}

/** Group OpenAI-format messages into caller turns with Ada's reply and some context. */
export function callerTurns(messages = []) {
  const turns = [];
  let current = null;
  const history = [];
  for (const m of messages) {
    const text = textOf(m);
    if (m.role === 'user' && text) {
      if (!current || current.reply) {
        current = { caller: [], reply: '', context: history.slice(-6) };
        turns.push(current);
      }
      current.caller.push(text);
      history.push(`Caller: ${text}`);
    } else if (m.role === 'assistant' && text) {
      if (current) current.reply = current.reply ? `${current.reply} ${text}` : text;
      history.push(`Ada: ${text}`);
    }
  }
  return turns.map((t) => ({ caller: t.caller.join(' '), reply: t.reply, context: t.context }));
}

async function scoreWithGroq(turn) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error('GROQ_API_KEY is not set');
  const user = [
    'CONVERSATION BEFORE THIS TURN:',
    turn.context.length ? turn.context.join('\n') : '(start of call)',
    '',
    `CALLER TURN: ${turn.caller}`,
    `ADA'S REPLY: ${turn.reply || '(none, the call ended)'}`,
  ].join('\n');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: RUBRIC },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      reasoning_effort: 'low',
      max_completion_tokens: 600,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Groq ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  const out = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
  return {
    caller_said: capitalise(typeof out.caller_said === 'string' && out.caller_said.trim() ? out.caller_said.trim() : turn.caller),
    language: ['english', 'pidgin', 'mixed'].includes(out.language) ? out.language : null,
    confusion_score: clampInt(out.confusion_score, 0, 3),
    ladder_level: clampInt(out.ladder_level, 0, 3),
    signals: Array.isArray(out.signals) ? out.signals.filter((s) => SIGNALS.includes(s)) : [],
  };
}

export function createScorer({ supabase, ensureCall, takePause }) {
  let claimColumn = true; // calls.scored_turns; falls back to counting rows if missing

  // Reserve turn `index` for this request. With the claim column this is an
  // atomic compare-and-set, so two function instances never score the same turn.
  async function claim(callId, index) {
    if (claimColumn) {
      const { data, error } = await supabase
        .from('calls')
        .update({ scored_turns: index + 1 })
        .eq('id', callId)
        .eq('scored_turns', index)
        .select('id');
      if (!error) return (data || []).length === 1;
      if (/scored_turns/.test(error.message)) {
        claimColumn = false;
        console.warn('calls.scored_turns missing, run the migration in supabase/schema.sql. Falling back to counting turns.');
      } else {
        throw error;
      }
    }
    const { count } = await supabase.from('turns').select('id', { count: 'exact', head: true }).eq('call_id', callId);
    return (count ?? 0) === index;
  }

  async function scoredSoFar(callId) {
    if (claimColumn) {
      const { data, error } = await supabase.from('calls').select('scored_turns').eq('id', callId).maybeSingle();
      if (!error) return data?.scored_turns ?? 0;
      if (/scored_turns/.test(error.message)) claimColumn = false;
      else throw error;
    }
    const { count } = await supabase.from('turns').select('id', { count: 'exact', head: true }).eq('call_id', callId);
    return count ?? 0;
  }

  /**
   * Score every caller turn Ada has replied to that isn't scored yet.
   * With `final` (end of call), the last unanswered turn is scored too.
   */
  return async function scoreNewTurns(callId, messages, { final = false } = {}) {
    if (!callId) return;
    const turns = callerTurns(messages).filter((t) => t.reply || final);
    if (!turns.length) return;
    await ensureCall(callId);
    let next = await scoredSoFar(callId);
    while (next < turns.length) {
      if (!(await claim(callId, next))) return; // another request is handling it
      const turn = turns[next];
      let scored;
      try {
        scored = await scoreWithGroq(turn);
      } catch (e) {
        console.error('scoring failed:', e.message);
        // keep the row so turn n still lines up with caller bubble n
        scored = { caller_said: turn.caller, language: null, confusion_score: 0, ladder_level: 0, signals: [] };
      }
      const { error } = await supabase.from('turns').insert({ call_id: callId, ...scored, pause_ms: await takePause(callId) });
      if (error) console.error('turn insert failed:', error.message);
      next += 1;
    }
  };
}
