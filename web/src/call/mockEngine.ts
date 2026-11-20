/* ---------------------------------------------------------------
   Mock engine: a scripted call that drives the exact same state as a
   real Vapi call, so the UI can be built and demoed without keys.
   Scripts follow the README test script and the 4 "try" orders.
   --------------------------------------------------------------- */
import type { Engine, EngineContext, Lang, Order, Signal, Turn } from './types';
import { STATUS_PLAIN } from './types';

type TurnInfo = { language: Lang; confusion: number; ladder: number; signals?: Signal[] };
type Step =
  | { ada: string }
  | { caller: string; turn: TurnInfo; pause: number }
  | { order: string }
  | { escalate: { reason: string; order_id: string } };

const GREETING =
  'Hello, welcome to Sharp Sharp Dispatch. My name na Ada. You fit talk to me for English or Pidgin. How I fit help you today?';

/* The four test orders, copied from supabase/schema.sql. */
const ORDERS: Record<string, Order> = {
  'SSD-1002': {
    id: 'SSD-1002', customer_name: 'Tunde Bakare', item: 'Laptop bag', pickup_area: 'Lekki Phase 1', delivery_area: 'Surulere',
    status: 'out_for_delivery', expected_delivery: today(0), delivery_fee_naira: 3000, payment_method: 'pay_on_delivery',
    delivery_attempts: 0, notes: 'Rider left the hub this morning.',
  },
  'SSD-1004': {
    id: 'SSD-1004', customer_name: 'Emeka Nwosu', item: 'Sneakers', pickup_area: 'Yaba', delivery_area: 'Victoria Island',
    status: 'at_hub', expected_delivery: today(1), delivery_fee_naira: 3000, payment_method: 'prepaid',
    delivery_attempts: 0, notes: "Sorted at Ikeja hub, waiting for tomorrow's island route.",
  },
  'SSD-1006': {
    id: 'SSD-1006', customer_name: 'Ibrahim Sule', item: 'Bluetooth speaker', pickup_area: 'Ikeja', delivery_area: 'Gbagada',
    status: 'failed_delivery', expected_delivery: today(0), delivery_fee_naira: 2500, payment_method: 'pay_on_delivery',
    delivery_attempts: 1, notes: 'Rider called twice, customer phone was switched off.',
  },
  'SSD-1008': {
    id: 'SSD-1008', customer_name: 'Segun Alabi', item: 'Gas regulator', pickup_area: 'Surulere', delivery_area: 'Festac',
    status: 'on_hold_address_issue', expected_delivery: today(1), delivery_fee_naira: 2500, payment_method: 'pay_on_delivery',
    delivery_attempts: 1, notes: 'Rider could not find the house number. Need landmark or correct address.',
  },
};

const SCRIPTS: Record<string, Step[]> = {
  // Pidgin caller who climbs the whole ladder and asks for a person.
  'SSD-1004': [
    { ada: GREETING },
    { caller: 'Abeg check my order, na 1004.', pause: 900, turn: { language: 'pidgin', confusion: 0, ladder: 0 } },
    { order: 'SSD-1004' },
    { ada: 'I don see am. Your sneakers dey our hub for Ikeja. E go reach Victoria Island tomorrow.' },
    { caller: 'At hub? Wetin be that one?', pause: 2600, turn: { language: 'pidgin', confusion: 2, ladder: 1, signals: ['pidgin_confusion_phrase'] } },
    { ada: 'No wahala, make I break am down. One: the rider don carry your sneakers from the seller. Two: e dey our hub now, our big sorting office. Three: tomorrow, another rider go bring am come your house. You dey follow?' },
    { caller: 'Hmm. Okay..?', pause: 4200, turn: { language: 'pidgin', confusion: 2, ladder: 2, signals: ['short_unsure_reply'] } },
    { ada: 'Think am like bus park. Your package don reach the park, e dey wait for the bus wey dey go Victoria Island. That bus go comot tomorrow morning.' },
    { caller: 'I still no get am. Abeg make I talk to person.', pause: 1800, turn: { language: 'pidgin', confusion: 3, ladder: 3, signals: ['pidgin_confusion_phrase', 'asked_for_human'] } },
    { escalate: { reason: 'caller_asked', order_id: 'SSD-1004' } },
    { ada: 'No problem at all. I don call one of our people. Person go call you back within 2 hours. Thank you for your patience.' },
  ],
  // English caller, one moment of confusion, solved with smaller steps.
  'SSD-1002': [
    { ada: GREETING },
    { caller: 'Can you check order 1002?', pause: 900, turn: { language: 'english', confusion: 0, ladder: 0 } },
    { order: 'SSD-1002' },
    { ada: 'Sure. Your laptop bag is out for delivery. A rider left our hub this morning and is on the way to Surulere today. You will pay on delivery.' },
    { caller: 'Pay on delivery? I thought I paid already.', pause: 1500, turn: { language: 'english', confusion: 2, ladder: 1, signals: ['wrong_paraphrase'] } },
    { ada: 'Let me take it step by step. One: this order is set to pay on delivery. Two: that means it has not been paid yet. Three: when the rider arrives, you pay three thousand naira, by cash or transfer. Does that make sense?' },
    { caller: "Ah, okay. That's clear, thank you.", pause: 1100, turn: { language: 'english', confusion: 0, ladder: 0 } },
    { ada: "You're welcome. Sharp sharp, your bag is on the way!" },
  ],
  // Mixed caller, solved by the analogy rung.
  'SSD-1006': [
    { ada: GREETING },
    { caller: 'Please check order 1006 for me.', pause: 900, turn: { language: 'mixed', confusion: 0, ladder: 0 } },
    { order: 'SSD-1006' },
    { ada: 'Your Bluetooth speaker delivery failed today. The rider called twice but your phone was switched off. We go try again.' },
    { caller: 'Failed? Wetin you mean by failed?', pause: 2200, turn: { language: 'pidgin', confusion: 2, ladder: 1, signals: ['pidgin_confusion_phrase'] } },
    { ada: 'Make I yarn am small small. One: the rider reach your area. Two: him call your phone two times. Three: your phone no go, so him carry the speaker go back. You dey follow?' },
    { caller: 'Him no fit find me? But I dey house.', pause: 3100, turn: { language: 'pidgin', confusion: 2, ladder: 2, signals: ['repeated_question'] } },
    { ada: 'E be like when you send person go market and the person no fit reach you to ask which stall. E go just come back. Our rider need to reach you on phone before e fit hand over.' },
    { caller: 'Ehen! Now I understand. Make dem try again tomorrow.', pause: 1200, turn: { language: 'pidgin', confusion: 0, ladder: 0 } },
    { ada: 'Correct. I don note am. Abeg keep your phone on tomorrow so the rider fit reach you.' },
  ],
  // Address problem: a handoff that is about the order, not confusion.
  'SSD-1008': [
    { ada: GREETING },
    { caller: 'My order na 1008.', pause: 900, turn: { language: 'pidgin', confusion: 0, ladder: 0 } },
    { order: 'SSD-1008' },
    { ada: 'Your gas regulator dey on hold. The rider no fit find the house number for Festac. We need landmark or the correct address.' },
    { caller: 'I no understand. Which address?', pause: 2400, turn: { language: 'pidgin', confusion: 2, ladder: 1, signals: ['pidgin_confusion_phrase'] } },
    { ada: 'Okay, step by step. One: the rider reach Festac. Two: him no see your house number. Three: if you give us one landmark near your house, like church or filling station, him go find am. You dey follow?' },
    { caller: 'Okay. Na near the big mosque for 4th Avenue. Abeg make una change am.', pause: 1600, turn: { language: 'pidgin', confusion: 1, ladder: 0 } },
    { escalate: { reason: 'reschedule_or_address_change', order_id: 'SSD-1008' } },
    { ada: 'Thank you. I don pass the landmark give our team. Person go call you back within 2 hours to confirm the new address.' },
  ],
};

export const MOCK_ORDER_IDS = Object.keys(SCRIPTS);

function today(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

class Cancelled extends Error {}

export function createMockEngine(ctx: EngineContext, orderId: string | null): Engine {
  const script = SCRIPTS[orderId ?? ''] ?? SCRIPTS['SSD-1004'];
  let cancelled = false;
  let volTimer: number | undefined;
  let lineNo = 0;
  let turnNo = 0;
  const timers = new Set<number>();

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (cancelled) return reject(new Cancelled());
      const t = window.setTimeout(() => {
        timers.delete(t);
        cancelled ? reject(new Cancelled()) : resolve();
      }, ms);
      timers.add(t);
    });

  // Simulated voice volume: a wobbly level while someone talks.
  const startVolume = (who: 'caller' | 'ada') => {
    stopVolume();
    let t = 0;
    volTimer = window.setInterval(() => {
      t += 1;
      const wobble = 0.35 + 0.3 * Math.abs(Math.sin(t * 0.9)) + Math.random() * 0.35;
      ctx.volume[who] = Math.min(1, wobble);
    }, 70);
  };
  const stopVolume = () => {
    if (volTimer) window.clearInterval(volTimer);
    volTimer = undefined;
    ctx.volume.caller = 0;
    ctx.volume.ada = 0;
  };

  // Words appear as they are "spoken", like Vapi's partial transcripts.
  const say = async (speaker: 'caller' | 'ada', text: string, msPerWord: number, tag?: { turn: number; lang: Lang }) => {
    const id = `m${++lineNo}`;
    const words = text.split(' ');
    startVolume(speaker);
    for (let i = 1; i <= words.length; i++) {
      ctx.dispatch({ type: 'line', line: { id, speaker, text: words.slice(0, i).join(' '), final: i === words.length, ...tag } });
      await sleep(msPerWord);
    }
    stopVolume();
  };

  async function run() {
    ctx.dispatch({ type: 'status', status: 'connecting' });
    await sleep(1100);
    ctx.dispatch({ type: 'callId', id: 'demo-call' });

    for (const step of script) {
      if ('ada' in step) {
        ctx.dispatch({ type: 'status', status: 'speaking' });
        await say('ada', step.ada, 210);
        ctx.dispatch({ type: 'status', status: 'listening' });
      } else if ('caller' in step) {
        ctx.dispatch({ type: 'status', status: 'listening' });
        await sleep(step.pause); // the caller's pause before speaking
        await say('caller', step.caller, 260, { turn: turnNo, lang: step.turn.language });
        ctx.dispatch({ type: 'status', status: 'thinking' });
        await sleep(650); // log_turn lands a moment later, like the real poll
        const turn: Turn = {
          id: ++turnNo,
          created_at: new Date().toISOString(),
          caller_said: step.caller,
          language: step.turn.language,
          confusion_score: step.turn.confusion,
          ladder_level: step.turn.ladder,
          signals: step.turn.signals ?? [],
          pause_ms: step.pause,
        };
        ctx.dispatch({ type: 'addTurn', turn });
        await sleep(450);
      } else if ('order' in step) {
        ctx.dispatch({ type: 'status', status: 'thinking' });
        ctx.dispatch({ type: 'order', order: { kind: 'loading', id: step.order } });
        await sleep(1100);
        const order = ORDERS[step.order];
        ctx.dispatch({
          type: 'order',
          order: order ? { kind: 'found', order: { ...order, status_in_plain_words: STATUS_PLAIN[order.status] } } : { kind: 'missing', id: step.order },
        });
      } else if ('escalate' in step) {
        ctx.dispatch({ type: 'status', status: 'thinking' });
        await sleep(700);
        ctx.dispatch({
          type: 'escalations',
          escalations: [{ id: 12, created_at: new Date().toISOString(), reason: step.escalate.reason, order_id: step.escalate.order_id }],
        });
      }
    }
    await sleep(900);
    ctx.dispatch({ type: 'status', status: 'ended' });
  }

  return {
    async start() {
      cancelled = false;
      run().catch((e) => {
        if (!(e instanceof Cancelled)) ctx.dispatch({ type: 'error', error: 'Something no work. Abeg try again.' });
      });
    },
    stop() {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      stopVolume();
    },
  };
}
