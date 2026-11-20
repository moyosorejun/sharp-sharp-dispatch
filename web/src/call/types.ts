export type Lang = 'english' | 'pidgin' | 'mixed';

export type Signal =
  | 'pidgin_confusion_phrase'
  | 'english_confusion_phrase'
  | 'repeated_question'
  | 'wrong_paraphrase'
  | 'short_unsure_reply'
  | 'frustration'
  | 'asked_for_human';

/** One row of the `turns` table (logged by Ada's log_turn tool). */
export type Turn = {
  id: number | string;
  created_at: string;
  caller_said: string | null;
  language: Lang | null;
  confusion_score: number; // 0-3
  ladder_level: number; // 0-3
  signals: Signal[] | null;
  pause_ms: number | null;
};

export type Escalation = {
  id: number;
  created_at: string;
  reason: string;
  order_id: string | null;
  summary?: string;
  notified?: boolean;
};

export type OrderStatus =
  | 'order_received'
  | 'picked_up'
  | 'in_transit_to_hub'
  | 'at_hub'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'on_hold_address_issue'
  | 'returned_to_sender'
  | 'cancelled';

export type Order = {
  id: string;
  customer_name: string;
  item: string;
  pickup_area: string;
  delivery_area: string;
  status: OrderStatus;
  expected_delivery: string | null;
  delivery_fee_naira: number;
  payment_method: 'prepaid' | 'pay_on_delivery';
  delivery_attempts: number;
  notes: string | null;
  status_in_plain_words?: string;
};

export type OrderState =
  | { kind: 'none' }
  | { kind: 'loading'; id: string }
  | { kind: 'found'; order: Order }
  | { kind: 'missing'; id: string }
  | { kind: 'error'; id: string };

export type Speaker = 'caller' | 'ada';
/**
 * One bubble = one speaker turn. `text` is the raw committed text (never
 * corrected); `partial` is the caller's live in-progress transcript, shown
 * as a typing line inside the same bubble.
 * Caller bubbles also carry what Ada logged for them via log_turn:
 * `said` (her correctly spelled version of the caller's words), `lang`,
 * and `turn` (index into CallState.turns, for the confusion chips).
 */
export type Line = {
  id: string;
  speaker: Speaker;
  text: string;
  partial?: string;
  final: boolean;
  said?: string;
  lang?: Lang;
  turn?: number;
};

export type CallStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended' | 'error';

export type CallState = {
  status: CallStatus;
  callId: string | null;
  lines: Line[];
  turns: Turn[];
  escalations: Escalation[];
  order: OrderState;
  error: string | null;
  micBlocked: boolean;
  dataError: boolean; // polling the server failed
};

export type Action =
  | { type: 'reset' }
  | { type: 'status'; status: CallStatus }
  | { type: 'callId'; id: string }
  | { type: 'line'; line: Line }
  | { type: 'turns'; turns: Turn[] }
  | { type: 'addTurn'; turn: Turn }
  | { type: 'escalations'; escalations: Escalation[] }
  | { type: 'order'; order: OrderState }
  | { type: 'error'; error: string; micBlocked?: boolean }
  | { type: 'dataError'; value: boolean };

/** Live volume levels, written by engines and read by the orb every frame. */
export type Volume = { caller: number; ada: number };

export type EngineContext = {
  dispatch: (a: Action) => void;
  volume: Volume;
};

export interface Engine {
  start(): Promise<void>;
  stop(): void;
}

/** Plain words for the transcript chips. */
export const SIGNAL_WORDS: Record<Signal, string> = {
  pidgin_confusion_phrase: 'Pidgin confusion phrase',
  english_confusion_phrase: 'said they are lost',
  repeated_question: 'asked again',
  wrong_paraphrase: 'got it mixed up',
  short_unsure_reply: 'short unsure reply',
  frustration: 'sounds frustrated',
  asked_for_human: 'asked for a person',
};

export const CONFUSION_LABELS = ['Clear', 'Unsure', 'Confused', 'Lost'] as const;

export const STATUS_PLAIN: Record<OrderStatus, string> = {
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
