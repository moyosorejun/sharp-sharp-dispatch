import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Chrome';
import { Button, Chip, MicIcon } from '../components/ui';
import { Orb, orbLabel } from '../components/call/Orb';
import { ConfusionMeter } from '../components/call/ConfusionMeter';
import { Ladder } from '../components/call/Ladder';
import { Transcript } from '../components/call/Transcript';
import { OrderPanel } from '../components/call/OrderCard';
import { EscalationToast } from '../components/call/EscalationToast';
import { callMode, useCall } from '../call/useCall';
import { MOCK_ORDER_IDS } from '../call/mockEngine';
import type { Escalation } from '../call/types';

const TABS = ['Transcript', 'Confusion', 'Order'] as const;

/* ---------------------------------------------------------------
   Live call view (brief 9.2). Calm focus: Forest, lots of space,
   colour only where it carries meaning.
   Desktop: transcript | orb | confusion + ladder, order.
   Mobile: orb on top, three swipeable tabs.
   --------------------------------------------------------------- */
export default function Call() {
  const [params] = useSearchParams();
  const mode = callMode(params);
  const orderParam = params.get('order')?.toUpperCase() ?? null;
  const mockOrder = orderParam && MOCK_ORDER_IDS.includes(orderParam) ? orderParam : 'SSD-1004';
  const { state, volume, start, stop, confusion, ladder, live } = useCall(mode, mode === 'mock' ? mockOrder : orderParam);

  /* toast for each new escalation */
  const seen = useRef(new Set<number>());
  const [toast, setToast] = useState<Escalation | null>(null);
  useEffect(() => {
    const fresh = state.escalations.find((e) => !seen.current.has(e.id));
    if (fresh) {
      seen.current.add(fresh.id);
      setToast(fresh);
    }
  }, [state.escalations]);
  const closeToast = useCallback(() => setToast(null), []);

  /* mobile tabs: a scroll-snap row, so swiping and tapping both work */
  const swiper = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isShort = useMediaQuery('(max-height: 860px)'); // e.g. a 1366x768 laptop
  const goTo = (i: number) => {
    const el = swiper.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    setTab(i);
  };
  useEffect(() => {
    const el = swiper.current;
    if (!el) return;
    const onScroll = () => setTab(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const hint = useMemo(() => {
    if (mode === 'mock') return 'Scripted demo. Just watch Ada work.';
    const n = orderParam?.replace(/\D/g, '');
    return `Try saying: "Abeg check ${n || '1004'}"`;
  }, [mode, orderParam]);

  const panel = (i: number) => ({
    id: `panel-${i}`,
    role: isMobile ? 'tabpanel' : undefined,
    'aria-labelledby': isMobile ? `tab-${i}` : undefined,
    inert: isMobile && tab !== i ? true : undefined,
  });

  return (
    <div className="relative min-h-screen bg-forest text-white lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      {/* pin-stripe edges */}
      <span className="pinstripes pointer-events-none absolute inset-y-0 left-0 hidden w-8 border-r-2 border-ink md:block xl:w-14" aria-hidden="true" />
      <span className="pinstripes pointer-events-none absolute inset-y-0 right-0 hidden w-8 border-l-2 border-ink md:block xl:w-14" aria-hidden="true" />

      <Nav cta={false} />
      <EscalationToast escalation={toast} onClose={closeToast} />

      <main id="main" className="relative mx-auto w-full max-w-[1320px] px-4 pb-14 sm:px-6 md:px-14 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:pb-6 xl:px-20">
        <h1 className="sr-only">Live call with Ada</h1>
        <div className="mb-5 flex shrink-0 flex-wrap items-center gap-3 lg:mb-4">
          {mode === 'mock' ? (
            <>
              <Chip tone="yellow">Demo call</Chip>
              <p className="text-[14px] text-white/75">Scripted call for order {mockOrder}. No mic needed.</p>
            </>
          ) : (
            <>
              <Chip tone="mint">Live call</Chip>
              <p className="text-[14px] text-white/75">Ada will ask to use your mic.</p>
            </>
          )}
        </div>

        <div className="call-grid">
          {/* ---------- orb ---------- */}
          <section className="call-orb flex flex-col items-center pb-6 pt-2 text-center lg:pb-0 lg:pt-0" aria-label="Call controls">
            <Orb status={state.status} confusion={confusion} volume={volume} onClick={start} size={isMobile ? 180 : isShort ? 150 : 200} />
            <p className="font-display mt-4 min-h-[1.5em] text-xl font-extrabold" aria-live="polite">
              {state.status === 'error' && state.error ? state.error : orbLabel(state.status)}
            </p>
            <p className="mt-1 max-w-[30ch] text-[14px] text-white/70">
              {state.status === 'idle' ? (mode === 'live' ? 'Abeg allow your mic so Ada fit hear you.' : hint) : live ? hint : ' '}
            </p>
            <div className="mt-4">
              {live ? (
                <Button variant="live" onClick={stop}>End call</Button>
              ) : (
                <Button onClick={start} size="lg" icon={<MicIcon className="h-5 w-5" />}>
                  {state.status === 'idle' ? 'Talk to Ada' : 'Talk again'}
                </Button>
              )}
            </div>
            {state.dataError && <p className="mt-4 text-[14px] text-yellow">Confusion data no dey load. Something no work. Abeg try again.</p>}
          </section>

          {/* ---------- mobile tabs ---------- */}
          <div role="tablist" aria-label="Call details" className="call-tabs mb-4 flex gap-2 lg:hidden">
            {TABS.map((t, i) => (
              <button
                key={t}
                id={`tab-${i}`}
                role="tab"
                type="button"
                aria-selected={tab === i}
                aria-controls={`panel-${i}`}
                onClick={() => goTo(i)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-ink px-3 py-2 text-[14px] font-bold ${
                  tab === i ? 'bg-mint text-ink' : 'bg-teal text-white'
                }`}
              >
                {t}
                {i === 1 && confusion !== null && (
                  <span className="h-2.5 w-2.5 rounded-full border border-ink" style={{ background: `var(--conf-${confusion})` }} aria-hidden="true" />
                )}
                {i === 2 && state.order.kind === 'found' && <span className="h-2.5 w-2.5 rounded-full border border-ink bg-yellow" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div ref={swiper} className="call-swiper">
            <section {...panel(0)} className="call-panel call-transcript" aria-label="Transcript">
              <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border-2 border-ink bg-cream text-ink shadow-[var(--shadow-hard)]">
                <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
                  <p className="label text-teal">Live transcript</p>
                  {live && (
                    <span className="label flex items-center gap-1.5 text-ink">
                      <span className="h-2.5 w-2.5 rounded-full bg-magenta" aria-hidden="true" /> Live
                    </span>
                  )}
                </div>
                <Transcript lines={state.lines} turns={state.turns} className="min-h-0 flex-1" />
              </div>
            </section>

            <section {...panel(1)} className="call-panel call-confusion" aria-label="Confusion and ladder">
              <div className="rounded-[var(--radius-md)] border-2 border-ink bg-cream p-5 text-ink shadow-[var(--shadow-hard)]">
                <ConfusionMeter score={confusion} />
                <hr className="my-4 border-t-2 border-ink/10" />
                <Ladder level={ladder} />
              </div>
            </section>

            {/* desktop: sits under the orb and slides in once check_order has run */}
            <section
              {...panel(2)}
              className={`call-panel call-order ${state.order.kind === 'none' ? 'lg:invisible' : ''}`}
              aria-label="Order"
            >
              <div
                key={state.order.kind === 'none' ? 'none' : 'order'}
                className="call-order-card rounded-[var(--radius-md)] border-2 border-ink bg-cream p-5 lg:p-4 text-ink shadow-[var(--shadow-hard)]"
              >
                <OrderPanel state={state.order} />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return match;
}
