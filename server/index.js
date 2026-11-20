// Sharp Sharp Dispatch: backend for the Vapi voice agent.
// One endpoint (/vapi) receives everything Vapi sends:
//   - tool-calls          -> check_order, find_order, log_turn, escalate_to_human
//   - speech-update       -> used to measure how long the caller pauses before speaking
//   - end-of-call-report  -> saves the transcript and call summary
import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '5mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------
// Optional shared secret. Set VAPI_SERVER_SECRET here and the same
// value as the server secret in Vapi, so only Vapi can call this API.
// ---------------------------------------------------------------
function checkSecret(req, res, next) {
  const secret = process.env.VAPI_SERVER_SECRET;
  if (!secret) return next();
  if (req.get('x-vapi-secret') === secret) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// ---------------------------------------------------------------
// Pause tracking, per call.
// When the assistant stops talking we note the time. When the caller
// starts talking, the gap is their pause. The next log_turn saves it.
//
// Stored on the `calls` row (assistant_stopped_at, pending_pause_ms),
// because on Vercel each request can land on a different function
// instance that shares no memory. If those columns don't exist yet
// (older schema), it falls back to memory, which works on one server.
// ---------------------------------------------------------------
const pauses = new Map(); // memory fallback: callId -> { assistantStoppedAt, lastPauseMs }
let pausesInDb = true;

function pauseDbFailed(e) {
  if (/assistant_stopped_at|pending_pause_ms|column/i.test(e.message)) {
    pausesInDb = false;
    console.warn('Pause columns missing on `calls`, using memory. Run the migration in supabase/schema.sql.');
  } else {
    console.error('pause tracking failed:', e.message);
  }
}

async function trackSpeech(callId, role, status) {
  if (!callId) return;
  const now = Date.now();
  const stopped = role === 'assistant' && status === 'stopped';
  const started = role === 'user' && status === 'started';
  if (!stopped && !started) return;

  if (pausesInDb) {
    try {
      if (stopped) {
        await ensureCall(callId);
        const { error } = await supabase.from('calls').update({ assistant_stopped_at: new Date(now).toISOString() }).eq('id', callId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('calls').select('assistant_stopped_at').eq('id', callId).maybeSingle();
        if (error) throw error;
        if (data?.assistant_stopped_at) {
          const { error: e2 } = await supabase
            .from('calls')
            .update({ assistant_stopped_at: null, pending_pause_ms: now - Date.parse(data.assistant_stopped_at) })
            .eq('id', callId);
          if (e2) throw e2;
        }
      }
      return;
    } catch (e) {
      pauseDbFailed(e);
    }
  }

  const entry = pauses.get(callId) || { assistantStoppedAt: null, lastPauseMs: null };
  if (stopped) entry.assistantStoppedAt = now;
  if (started && entry.assistantStoppedAt) {
    entry.lastPauseMs = now - entry.assistantStoppedAt;
    entry.assistantStoppedAt = null;
  }
  pauses.set(callId, entry);
}

async function takePause(callId) {
  if (pausesInDb) {
    try {
      const { data, error } = await supabase.from('calls').select('pending_pause_ms').eq('id', callId).maybeSingle();
      if (error) throw error;
      const ms = data?.pending_pause_ms ?? null;
      if (ms !== null) await supabase.from('calls').update({ pending_pause_ms: null }).eq('id', callId);
      return ms;
    } catch (e) {
      pauseDbFailed(e);
    }
  }
  const entry = pauses.get(callId);
  if (!entry) return null;
  const ms = entry.lastPauseMs;
  entry.lastPauseMs = null;
  return ms;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
async function ensureCall(callId) {
  if (!callId) return;
  await supabase.from('calls').upsert({ id: callId }, { onConflict: 'id', ignoreDuplicates: true });
}

function parseArgs(args) {
  if (!args) return {};
  if (typeof args === 'string') {
    try { return JSON.parse(args); } catch { return {}; }
  }
  return args;
}

// "1004", "ssd 1004", "SSD-1004" -> "SSD-1004"
function normaliseOrderId(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  return digits ? `SSD-${digits}` : String(raw).trim().toUpperCase();
}

const STATUS_PLAIN = {
  order_received: 'We have the order but the rider has not picked it up from the seller yet.',
  picked_up: 'The rider has collected the package from the seller and is taking it to our hub.',
  in_transit_to_hub: 'The package is moving to our sorting hub.',
  at_hub: 'The package is at our hub and is being sorted onto the route for its delivery area.',
  out_for_delivery: 'A rider is on the way to the customer with the package today.',
  delivered: 'The package has been delivered.',
  failed_delivery: 'The rider tried to deliver but could not hand it over. We will try again.',
  on_hold_address_issue: 'Delivery is paused because the rider needs a clearer address, landmark or gate code.',
  returned_to_sender: 'After failed attempts, the package was sent back to the seller.',
  cancelled: 'The order was cancelled.',
};

// ---------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------
const tools = {
  async check_order(args) {
    const id = normaliseOrderId(args.order_id);
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return JSON.stringify({ found: false, order_id: id });
    return JSON.stringify({
      found: true,
      order_id: data.id,
      customer_name: data.customer_name,
      item: data.item,
      from: data.pickup_area,
      to: data.delivery_area,
      status: data.status,
      status_in_plain_words: STATUS_PLAIN[data.status],
      expected_delivery: data.expected_delivery,
      delivery_fee_naira: data.delivery_fee_naira,
      payment_method: data.payment_method,
      delivery_attempts: data.delivery_attempts,
      notes: data.notes,
    });
  },

  // For callers who don't know their order ID. Needs BOTH the customer's
  // name and the delivery area to match, so a stranger can't fish for
  // orders with a name alone. Matching is loose because names and areas
  // come through speech-to-text.
  async find_order(args) {
    const words = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
    const nameWords = words(args.customer_name);
    // common short forms callers use for areas
    const AREA_ALIASES = { vi: 'victoria island', ph: 'port harcourt' };
    const area = String(args.delivery_area ?? '').replace(/\b(vi|ph)\b/gi, (m) => AREA_ALIASES[m.toLowerCase()]);
    const areaWords = words(area);
    if (!nameWords.length || !areaWords.length) {
      return JSON.stringify({ found: false, reason: 'need both the name on the order and the delivery area' });
    }
    const { data, error } = await supabase.from('orders').select('id, customer_name, item, delivery_area');
    if (error) throw new Error(error.message);
    const close = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4))));
    const overlaps = (want, have) => want.some((w) => have.some((h) => close(w, h)));
    const matches = (data || []).filter(
      (o) => overlaps(nameWords, words(o.customer_name)) && overlaps(areaWords, words(o.delivery_area))
    );
    if (matches.length === 1) {
      return JSON.stringify({ found: true, order_id: matches[0].id, item: matches[0].item, next_step: 'Confirm the item with the caller, then call check_order with this order_id.' });
    }
    if (matches.length > 1) {
      return JSON.stringify({
        found: false,
        reason: 'more than one order matches',
        orders: matches.map((o) => ({ order_id: o.id, item: o.item })),
        next_step: 'Ask which item they are expecting (do not read the list out), then call check_order with the matching order_id.',
      });
    }
    return JSON.stringify({ found: false, reason: 'no order matches that name and delivery area' });
  },

  async log_turn(args, callId) {
    await ensureCall(callId);
    const { error } = await supabase.from('turns').insert({
      call_id: callId,
      caller_said: args.caller_said ?? null,
      language: args.language ?? null,
      confusion_score: Number(args.confusion_score ?? 0),
      ladder_level: Number(args.ladder_level ?? 0),
      signals: Array.isArray(args.signals) ? args.signals : [],
      pause_ms: await takePause(callId),
    });
    if (error) throw new Error(error.message);
    return 'logged';
  },

  async escalate_to_human(args, callId) {
    await ensureCall(callId);
    const { data, error } = await supabase
      .from('escalations')
      .insert({
        call_id: callId,
        reason: args.reason ?? 'unspecified',
        summary: args.summary ?? '',
        order_id: args.order_id ? normaliseOrderId(args.order_id) : null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    await supabase.from('calls').update({ escalated: true }).eq('id', callId);

    // Send the alert to n8n (WhatsApp / email happens there).
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escalation_id: data.id,
            call_id: callId,
            reason: args.reason,
            summary: args.summary,
            order_id: args.order_id ?? null,
            caller_language: args.caller_language ?? null,
            created_at: new Date().toISOString(),
          }),
        });
        if (res.ok) await supabase.from('escalations').update({ notified: true }).eq('id', data.id);
      } catch (e) {
        console.error('n8n webhook failed:', e.message);
      }
    }
    return `escalated. ticket number ${data.id}`;
  },
};

// ---------------------------------------------------------------
// End of call: save transcript, main language, max confusion.
// ---------------------------------------------------------------
async function saveCallReport(message) {
  const callId = message.call?.id;
  if (!callId) return;
  await ensureCall(callId);

  const { data: turnRows } = await supabase
    .from('turns')
    .select('confusion_score, language')
    .eq('call_id', callId);

  const maxConfusion = Math.max(0, ...(turnRows || []).map((t) => t.confusion_score));
  const counts = {};
  for (const t of turnRows || []) if (t.language) counts[t.language] = (counts[t.language] || 0) + 1;
  const mainLanguage = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  await supabase
    .from('calls')
    .update({
      ended_at: new Date().toISOString(),
      ended_reason: message.endedReason ?? null,
      transcript: message.artifact?.transcript ?? null,
      main_language: mainLanguage,
      max_confusion: maxConfusion,
    })
    .eq('id', callId);

  pauses.delete(callId);
}

// ---------------------------------------------------------------
// Routes
// ---------------------------------------------------------------
app.get('/', (_req, res) => res.send('Sharp Sharp Dispatch agent server is running.'));

app.post('/vapi', checkSecret, async (req, res) => {
  const message = req.body?.message ?? {};
  const callId = message.call?.id;

  try {
    switch (message.type) {
      case 'tool-calls': {
        const results = await Promise.all(
          (message.toolCallList || []).map(async (call) => {
            const name = call.function?.name;
            const handler = tools[name];
            if (!handler) return { toolCallId: call.id, name, error: `unknown tool ${name}` };
            try {
              const result = await handler(parseArgs(call.function?.arguments), callId);
              return { toolCallId: call.id, name, result };
            } catch (e) {
              console.error(`${name} failed:`, e.message);
              return { toolCallId: call.id, name, error: e.message };
            }
          })
        );
        return res.status(200).json({ results }); // Vapi needs HTTP 200, even for errors
      }

      case 'speech-update':
        await trackSpeech(callId, message.role, message.status);
        return res.status(200).json({});

      case 'end-of-call-report':
        await saveCallReport(message);
        return res.status(200).json({});

      default:
        return res.status(200).json({});
    }
  } catch (e) {
    console.error('Error handling', message.type, e);
    return res.status(200).json({});
  }
});

// ---------------------------------------------------------------
// Read-only API for the web app (web/). No secrets leave the server:
// the browser only ever sees these JSON responses.
// ---------------------------------------------------------------
const WEB_ORIGINS = (process.env.WEB_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const api = express.Router();

api.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && WEB_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const CALL_COLUMNS = 'id, started_at, ended_at, ended_reason, main_language, max_confusion, escalated';

function sendError(res, e) {
  console.error('api error:', e.message);
  res.status(500).json({ error: 'Something no work. Abeg try again.' });
}

// Latest 50 calls (no transcripts, to keep the list light)
api.get('/calls', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select(CALL_COLUMNS)
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    sendError(res, e);
  }
});

// One call with its turns and escalations
api.get('/calls/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [call, turns, escalations] = await Promise.all([
      supabase.from('calls').select('*').eq('id', id).maybeSingle(),
      supabase.from('turns').select('*').eq('call_id', id).order('created_at'),
      supabase.from('escalations').select('*').eq('call_id', id).order('created_at'),
    ]);
    for (const r of [call, turns, escalations]) if (r.error) throw r.error;
    if (!call.data) return res.status(404).json({ error: 'Call not found' });
    res.json({ ...call.data, turns: turns.data, escalations: escalations.data });
  } catch (e) {
    sendError(res, e);
  }
});

// Turns (and any escalation) for a live call; the web app polls this every 1.5s
api.get('/calls/:id/turns', async (req, res) => {
  try {
    const id = req.params.id;
    const [turns, escalations] = await Promise.all([
      supabase.from('turns').select('*').eq('call_id', id).order('created_at'),
      supabase.from('escalations').select('id, created_at, reason, order_id').eq('call_id', id).order('created_at'),
    ]);
    for (const r of [turns, escalations]) if (r.error) throw r.error;
    res.json({ turns: turns.data, escalations: escalations.data });
  } catch (e) {
    sendError(res, e);
  }
});

// One order, for the order card
api.get('/orders/:id', async (req, res) => {
  try {
    const id = normaliseOrderId(req.params.id);
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Order not found', order_id: id });
    res.json({ ...data, status_in_plain_words: STATUS_PLAIN[data.status] });
  } catch (e) {
    sendError(res, e);
  }
});

// KPI numbers for the dashboard, plus a per-day series for sparklines
api.get('/stats', async (_req, res) => {
  try {
    const { data: calls, error } = await supabase
      .from('calls')
      .select('id, started_at, main_language, max_confusion, escalated')
      .order('started_at', { ascending: true });
    if (error) throw error;
    const { data: turnRows, error: tErr } = await supabase.from('turns').select('call_id, ladder_level');
    if (tErr) throw tErr;

    const total = calls.length;
    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const escalated = calls.filter((c) => c.escalated).length;
    const pidgin = calls.filter((c) => c.main_language === 'pidgin' || c.main_language === 'mixed').length;

    // last 14 days, one point per day
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const daily = days.map((day) => {
      const dayCalls = calls.filter((c) => c.started_at.slice(0, 10) === day);
      return {
        day,
        calls: dayCalls.length,
        avg_max_confusion: avg(dayCalls.map((c) => c.max_confusion ?? 0)),
        escalation_rate: dayCalls.length ? dayCalls.filter((c) => c.escalated).length / dayCalls.length : 0,
        pidgin_share: dayCalls.length
          ? dayCalls.filter((c) => c.main_language === 'pidgin' || c.main_language === 'mixed').length / dayCalls.length
          : 0,
      };
    });

    // Ladder outcomes: calls whose highest ladder level was 1 or 2,
    // split by whether they were escalated in the end.
    const maxLevel = new Map();
    for (const t of turnRows) maxLevel.set(t.call_id, Math.max(maxLevel.get(t.call_id) ?? 0, t.ladder_level));
    const ladder_outcomes = [1, 2].map((level) => {
      const reached = calls.filter((c) => maxLevel.get(c.id) === level);
      const esc = reached.filter((c) => c.escalated).length;
      return { level, resolved: reached.length - esc, escalated: esc };
    });

    res.json({
      total_calls: total,
      avg_max_confusion: avg(calls.map((c) => c.max_confusion ?? 0)),
      escalation_rate: total ? escalated / total : 0,
      pidgin_share: total ? pidgin / total : 0,
      daily,
      ladder_outcomes,
    });
  } catch (e) {
    sendError(res, e);
  }
});

// Escalations list for the dashboard
api.get('/escalations', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('escalations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    sendError(res, e);
  }
});

app.use('/api', api);

// On Vercel the app runs as a function, so it is exported instead of listening.
export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Agent server listening on http://localhost:${port}`));
}
