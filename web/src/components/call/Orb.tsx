import { useEffect, useRef, type MutableRefObject } from 'react';
import type { CallStatus, Volume } from '../../call/types';

/* ---------------------------------------------------------------
   Ada orb (brief 8.1). Four geometric shapes orbit each other.
   One rAF loop writes transforms directly (no React re-renders,
   transform and opacity only):
     idle       slow drift
     listening  shapes pulse with the caller's mic volume, Mint halo
     thinking   shapes gather to the centre and spin faster
     speaking   shapes expand and contract with Ada's volume
   The outer ring shows the latest confusion colour (400ms fade).
   Reduced motion: shapes stay still; ring colour still changes.
   --------------------------------------------------------------- */

type Shape = {
  kind: 'quarter' | 'pill' | 'circle';
  color: string;
  w: number;
  h: number;
  base: number; // starting angle around the centre
  r: number; // orbit radius
  spin: number; // own rotation offset
};

const SHAPES: Shape[] = [
  { kind: 'quarter', color: 'var(--ss-green)', w: 84, h: 84, base: 0, r: 30, spin: 0 },
  { kind: 'quarter', color: 'var(--ss-mint)', w: 72, h: 72, base: 120, r: 34, spin: 180 },
  { kind: 'pill', color: 'var(--ss-cream)', w: 92, h: 40, base: 230, r: 36, spin: 30 },
  { kind: 'circle', color: 'var(--ss-teal)', w: 40, h: 40, base: 300, r: 58, spin: 0 },
];

const SPEED: Record<CallStatus, number> = { idle: 12, connecting: 60, listening: 18, thinking: 170, speaking: 24, ended: 6, error: 6 };
const SPREAD: Record<CallStatus, number> = { idle: 1, connecting: 0.55, listening: 1, thinking: 0.2, speaking: 1.05, ended: 0.85, error: 0.85 };

const LABEL: Record<CallStatus, string> = {
  idle: 'Tap to talk to Ada',
  connecting: 'Connecting to Ada...',
  listening: 'Ada dey listen',
  thinking: 'Ada dey check...',
  speaking: 'Ada dey talk',
  ended: 'Call don end. Thank you!',
  error: 'Something no work. Abeg try again.',
};

export function orbLabel(status: CallStatus) {
  return LABEL[status];
}

export function Orb({
  status,
  confusion,
  volume,
  onClick,
  size = 220,
}: {
  status: CallStatus;
  confusion: number | null;
  volume: MutableRefObject<Volume>;
  onClick?: () => void;
  size?: number;
}) {
  const root = useRef<HTMLButtonElement>(null);
  const shapeEls = useRef<(HTMLSpanElement | null)[]>([]);
  const halo = useRef<HTMLSpanElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const scale = size / 220;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let last = performance.now();
    let angle = 0;
    let speed = SPEED.idle;
    let spread = 1;
    let vol = 0;
    let visible = true;

    const place = (a: number, sp: number, s: number) => {
      SHAPES.forEach((shape, i) => {
        const el = shapeEls.current[i];
        if (!el) return;
        const turn = shape.base + a;
        el.style.transform = `rotate(${turn}deg) translateX(${shape.r * sp * scale}px) rotate(${-turn + shape.spin + a * 0.6}deg) scale(${s})`;
      });
      if (halo.current) halo.current.style.transform = `scale(${1 + vol * 0.22})`;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = statusRef.current;
      const k = 1 - Math.pow(0.001, dt); // smooth easing toward targets
      speed += (SPEED[st] - speed) * k;
      spread += (SPREAD[st] - spread) * k;
      const target = st === 'listening' ? volume.current.caller : st === 'speaking' ? volume.current.ada : 0;
      vol += (target - vol) * Math.min(1, dt * 14);
      angle = (angle + speed * dt) % 360;
      place(angle, spread, 1 + vol * 0.4);
      if (visible) raf = requestAnimationFrame(frame);
    };

    const run = () => {
      cancelAnimationFrame(raf);
      if (reduce.matches) {
        place(0, 1, 1);
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    // pause the loop while the orb is off screen
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) run();
      else cancelAnimationFrame(raf);
    });
    if (root.current) io.observe(root.current);
    reduce.addEventListener('change', run);
    run();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      reduce.removeEventListener('change', run);
    };
  }, [size, volume]);

  const canStart = status === 'idle' || status === 'ended' || status === 'error';

  return (
    <button
      ref={root}
      type="button"
      onClick={canStart ? onClick : undefined}
      aria-disabled={!canStart}
      aria-label={canStart ? 'Start a call with Ada' : `Call in progress: ${LABEL[status]}`}
      className={`relative grid shrink-0 place-items-center rounded-full ${canStart ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ width: size + 28, height: size + 28 }}
    >
      {/* Mint listening halo */}
      <span
        ref={halo}
        aria-hidden="true"
        className="absolute inset-0 rounded-full border-[3px] border-mint transition-opacity duration-300"
        style={{ opacity: status === 'listening' ? 1 : 0 }}
      />
      {/* confusion rings: one per level, cross-faded so only opacity animates */}
      <span aria-hidden="true" className="absolute rounded-full border-[7px] border-teal" style={{ inset: 8 }} />
      {[0, 1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className="absolute rounded-full border-[7px] transition-opacity duration-[400ms]"
          style={{ inset: 8, borderColor: `var(--conf-${n})`, opacity: confusion === n ? 1 : 0 }}
        />
      ))}
      {/* the disc and its shapes */}
      <span
        aria-hidden="true"
        className="relative overflow-hidden rounded-full border-2 border-ink bg-forest"
        style={{ width: size - 4, height: size - 4, boxShadow: 'inset 0 0 0 6px var(--ss-ink)' }}
      >
        {SHAPES.map((s, i) => (
          <span
            key={i}
            ref={(el) => {
              shapeEls.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 border-2 border-ink will-change-transform"
            style={{
              width: (s.w * size) / 220,
              height: (s.h * size) / 220,
              marginLeft: -(s.w * size) / 440,
              marginTop: -(s.h * size) / 440,
              background: s.color,
              borderRadius: s.kind === 'quarter' ? '100% 0 0 0' : '999px',
            }}
          />
        ))}
      </span>
    </button>
  );
}
