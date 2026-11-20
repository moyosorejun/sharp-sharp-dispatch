import { useCallback, useEffect, useReducer, useRef } from 'react';
import { config } from '../config';
import { createMockEngine } from './mockEngine';
import { createVapiEngine } from './vapiEngine';
import type { Action, CallState, Engine, Volume } from './types';

const initial: CallState = {
  status: 'idle',
  callId: null,
  lines: [],
  turns: [],
  escalations: [],
  order: { kind: 'none' },
  error: null,
  micBlocked: false,
  dataError: false,
};

function reducer(state: CallState, a: Action): CallState {
  switch (a.type) {
    case 'reset':
      return initial;
    case 'status':
      // a late event must not reopen a finished call
      if (state.status === 'ended' && a.status !== 'ended') return state;
      return { ...state, status: a.status };
    case 'callId':
      return { ...state, callId: a.id };
    case 'line': {
      const i = state.lines.findIndex((l) => l.id === a.line.id);
      const lines = i === -1 ? [...state.lines, a.line] : state.lines.map((l, n) => (n === i ? a.line : l));
      return { ...state, lines };
    }
    case 'turns':
      return { ...state, turns: a.turns };
    case 'addTurn':
      return { ...state, turns: [...state.turns, a.turn] };
    case 'escalations':
      return { ...state, escalations: a.escalations };
    case 'order':
      return { ...state, order: a.order };
    case 'error':
      return { ...state, status: 'error', error: a.error, micBlocked: !!a.micBlocked };
    case 'dataError':
      return { ...state, dataError: a.value };
  }
}

/** Live mode needs both Vapi keys; `?demo` forces the scripted call. */
export function callMode(search: URLSearchParams): 'live' | 'mock' {
  if (search.has('demo')) return 'mock';
  return config.vapiPublicKey && config.vapiAssistantId ? 'live' : 'mock';
}

export function useCall(mode: 'live' | 'mock', orderId: string | null) {
  const [state, dispatch] = useReducer(reducer, initial);
  const volume = useRef<Volume>({ caller: 0, ada: 0 });
  const engine = useRef<Engine | null>(null);

  const start = useCallback(() => {
    engine.current?.stop();
    dispatch({ type: 'reset' });
    const ctx = { dispatch, volume: volume.current };
    engine.current =
      mode === 'live'
        ? createVapiEngine(ctx, config.vapiPublicKey, config.vapiAssistantId)
        : createMockEngine(ctx, orderId);
    engine.current.start();
  }, [mode, orderId]);

  const stop = useCallback(() => {
    engine.current?.stop();
    dispatch({ type: 'status', status: 'ended' });
  }, []);

  // hang up if the visitor leaves the page mid-call
  useEffect(() => () => engine.current?.stop(), []);

  const latest = state.turns.at(-1) ?? null;
  return {
    state,
    volume,
    start,
    stop,
    confusion: latest ? latest.confusion_score : null,
    ladder: latest ? latest.ladder_level : null,
    live: ['connecting', 'listening', 'thinking', 'speaking'].includes(state.status),
  };
}
