import type { CSSProperties } from 'react';
import { usePauseOffscreen } from '../lib/usePauseOffscreen';

/* ---------------------------------------------------------------
   The 3D package (brief 7.2): a CSS cube with 6 faces.
   Package Yellow, darker top face, tape stripe, small Sharp Sharp label.
   Floats with a 4s bob; the oval shadow shrinks as it rises.
   --------------------------------------------------------------- */
type Props = {
  size?: number;          // edge length in px
  tilt?: number;          // extra Y rotation in degrees, so packages differ
  delay?: number;         // bob delay in seconds, so they don't move in sync
  float?: boolean;
  shadow?: string;        // shadow colour (use a lighter token on Ink backgrounds)
  className?: string;
  style?: CSSProperties;
};

const shade = (alpha: number) =>
  `linear-gradient(rgba(11,11,11,${alpha}), rgba(11,11,11,${alpha}))`;

export function Package({ size = 120, tilt = 0, delay = 0, float = true, shadow = 'var(--ss-ink)', className = '', style }: Props) {
  const ref = usePauseOffscreen<HTMLDivElement>();
  const half = size / 2;
  const tape = Math.max(8, size * 0.18);
  const face: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: size,
    height: size,
    border: `${size > 70 ? 2 : 1.5}px solid var(--ss-ink)`,
    backgroundColor: 'var(--ss-yellow)',
    backfaceVisibility: 'hidden',
  };
  // tape runs across the top and down the front: a slightly darker band
  const tapeBand = (dir: 'v' | 'h'): CSSProperties => ({
    position: 'absolute',
    background: 'rgba(11,11,11,0.16)',
    ...(dir === 'v'
      ? { left: half - tape / 2, top: 0, bottom: 0, width: tape }
      : { top: half - tape / 2, left: 0, right: 0, height: tape }),
  });

  return (
    <div ref={ref} className={`${className.includes('absolute') ? '' : 'relative'} ${className}`} style={{ width: size * 1.5, height: size * 1.75, ...style }} aria-hidden="true">
      {/* bobbing cube */}
      <div className={float ? 'anim-bob will-change-transform' : ''} style={{ position: 'absolute', left: size * 0.25, top: size * 0.2, animationDelay: `${delay}s` }}>
        <div
          style={{
            width: size,
            height: size,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `rotateX(-24deg) rotateY(${-38 + tilt}deg)`,
          }}
        >
          {/* front: tape + label */}
          <div style={{ ...face, transform: `translateZ(${half}px)` }}>
            <div style={tapeBand('v')} />
            <div
              style={{
                position: 'absolute',
                right: size * 0.08,
                bottom: size * 0.1,
                width: size * 0.34,
                height: size * 0.22,
                background: 'var(--ss-white)',
                border: '1.5px solid var(--ss-ink)',
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: Math.max(6, size * 0.085),
                fontWeight: 700,
                color: 'var(--ss-ink)',
                lineHeight: 1,
              }}
            >
              {size >= 60 ? 'SS' : ''}
            </div>
          </div>
          {/* back */}
          <div style={{ ...face, transform: `rotateY(180deg) translateZ(${half}px)` }} />
          {/* right side, a touch of shade */}
          <div style={{ ...face, backgroundImage: shade(0.1), transform: `rotateY(90deg) translateZ(${half}px)` }} />
          {/* left */}
          <div style={{ ...face, backgroundImage: shade(0.1), transform: `rotateY(-90deg) translateZ(${half}px)` }} />
          {/* top: darker, with the tape running across */}
          <div style={{ ...face, backgroundImage: shade(0.2), transform: `rotateX(90deg) translateZ(${half}px)` }}>
            <div style={tapeBand('v')} />
          </div>
          {/* bottom */}
          <div style={{ ...face, backgroundImage: shade(0.3), transform: `rotateX(-90deg) translateZ(${half}px)` }} />
        </div>
      </div>
      {/* oval shadow */}
      <div
        className={float ? 'anim-bob-shadow' : ''}
        style={{
          position: 'absolute',
          left: size * 0.3,
          bottom: 0,
          width: size * 0.9,
          height: size * 0.14,
          borderRadius: '50%',
          // soft edge from a gradient, not a blur filter, so the loop stays cheap
          background: `radial-gradient(closest-side, ${shadow} 55%, transparent)`,
          opacity: 0.45,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

/* Flat package icon for the wordmark and small UI. */
export function PackageIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 3 28 9v14l-12 6-12-6V9z" fill="var(--ss-yellow)" stroke="var(--ss-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 9l12 6 12-6M16 15v14" fill="none" stroke="var(--ss-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="m10 6 12 6" stroke="var(--ss-ink)" strokeWidth="2" />
    </svg>
  );
}
