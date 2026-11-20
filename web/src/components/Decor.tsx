import { Link } from 'react-router-dom';
import { usePauseOffscreen } from '../lib/usePauseOffscreen';
import { MicIcon } from './ui';

/* ---------------------------------------------------------------
   Adire squiggle texture (brief 7.4). Original repeating tile of
   squiggles, dots and short dashes in Teal and Magenta.
   Sits absolutely behind dark sections.
   --------------------------------------------------------------- */
export function AdirePattern({ opacity = 0.22, id = 'adire' }: { opacity?: number; id?: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} aria-hidden="true">
      <defs>
        <pattern id={id} width="120" height="120" patternUnits="userSpaceOnUse">
          <g fill="none" strokeLinecap="round" strokeWidth="3">
            <path d="M8 22c8-10 16 10 24 0s16 10 24 0" stroke="var(--ss-teal)" />
            <path d="M66 70c6-8 12 8 18 0s12 8 18 0" stroke="var(--ss-magenta)" />
            <path d="M16 92q8 -14 16 0t16 0" stroke="var(--ss-teal)" />
            <path d="M74 14l8 8M86 14l8 8M98 14l8 8" stroke="var(--ss-teal)" />
            <path d="M20 56h10M38 56h10" stroke="var(--ss-magenta)" />
            <circle cx="92" cy="104" r="7" stroke="var(--ss-teal)" />
          </g>
          <g fill="var(--ss-teal)">
            <circle cx="62" cy="40" r="2.5" />
            <circle cx="72" cy="44" r="2.5" />
            <circle cx="10" cy="74" r="2.5" />
            <circle cx="110" cy="58" r="2.5" />
          </g>
          <circle cx="52" cy="110" r="2.5" fill="var(--ss-magenta)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Geometric block cluster (brief 7.1): quarter circles, half circle,
   pill and square in brand colours with Ink outlines.
   --------------------------------------------------------------- */
export function BlockCluster({ variant = 'a', className = '' }: { variant?: 'a' | 'b' | 'c'; className?: string }) {
  const s = { stroke: 'var(--ss-ink)', strokeWidth: 2.5 };
  if (variant === 'b') {
    return (
      <svg viewBox="0 0 200 160" className={className} aria-hidden="true">
        <path d="M4 156V60a96 96 0 0 1 96 96z" fill="var(--ss-mint)" {...s} />
        <rect x="104" y="96" width="60" height="60" rx="6" fill="var(--ss-magenta)" {...s} />
        <rect x="112" y="40" width="84" height="40" rx="20" fill="var(--ss-yellow)" {...s} />
      </svg>
    );
  }
  if (variant === 'c') {
    return (
      <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
        <path d="M4 116a52 52 0 0 1 104 0z" fill="var(--ss-green)" {...s} />
        <path d="M112 116V12a104 104 0 0 1 104 104z" fill="var(--ss-yellow)" {...s} />
        <circle cx="70" cy="34" r="16" fill="var(--ss-magenta)" {...s} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 180 180" className={className} aria-hidden="true">
      <path d="M176 4H80a96 96 0 0 0 96 96z" fill="var(--ss-green)" {...s} />
      <path d="M4 176a72 72 0 0 1 72-72v72z" fill="var(--ss-magenta)" {...s} />
      <rect x="92" y="120" width="84" height="40" rx="20" fill="var(--ss-mint)" {...s} />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Crossing marquee ribbons (brief 7.3). Magenta at -4deg,
   Yellow at +3deg, scrolling in opposite directions.
   --------------------------------------------------------------- */
const RIBBON_TEXT = ['Sharp sharp delivery', 'We dey come', 'Abeg no vex', 'Ada dey here for you'];

function RibbonTrack({ dir }: { dir: 'left' | 'right' }) {
  const run = (
    <span className="flex shrink-0 items-center">
      {[...RIBBON_TEXT, ...RIBBON_TEXT].map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="px-5">{t}</span>
          <span aria-hidden="true">•</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className={`flex w-max will-change-transform ${dir === 'left' ? 'anim-marquee-left' : 'anim-marquee-right'}`}>
      {run}
      {run}
    </div>
  );
}

export function Ribbons() {
  const ref = usePauseOffscreen<HTMLDivElement>();
  return (
    <div ref={ref} className="relative h-[170px] overflow-hidden bg-ink sm:h-[200px]" role="presentation">
      <div
        className="font-display absolute left-[-5%] top-1/2 w-[110%] -translate-y-1/2 rotate-[3deg] border-y-2 border-ink bg-yellow py-3 text-xl font-extrabold text-ink sm:text-2xl"
        aria-hidden="true"
      >
        <RibbonTrack dir="right" />
      </div>
      <div
        className="font-display absolute left-[-5%] top-1/2 w-[110%] -translate-y-1/2 rotate-[-4deg] border-y-2 border-ink bg-magenta py-3 text-xl font-extrabold text-white sm:text-2xl"
        aria-hidden="true"
      >
        <RibbonTrack dir="left" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Spinning "Talk to Ada" badge (brief 7.3). Main CTA on landing.
   --------------------------------------------------------------- */
export function SpinningBadge({ to = '/call', size = 168 }: { to?: string; size?: number }) {
  const ref = usePauseOffscreen<HTMLDivElement>();
  return (
    <div ref={ref} className="group relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="anim-spin absolute inset-0 h-full w-full will-change-transform" aria-hidden="true">
        <defs>
          <path id="badge-circle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        </defs>
        <circle cx="100" cy="100" r="97" fill="var(--ss-yellow)" stroke="var(--ss-ink)" strokeWidth="3" />
        <text fontFamily="Unbounded, sans-serif" fontWeight="800" fontSize="19" fill="var(--ss-ink)">
          {/* two repeats spread over the whole circle (2 x pi x 74 = 465), so the seam never overlaps */}
          <textPath href="#badge-circle" textLength="463" lengthAdjust="spacing">
            TALK TO ADA • TALK TO ADA •
          </textPath>
        </text>
      </svg>
      {/* the whole badge is clickable; its name is "Talk to Ada" */}
      <Link to={to} aria-label="Talk to Ada" className="absolute inset-0 grid place-items-center rounded-full">
        <span
          className="press relative grid place-items-center rounded-full bg-green text-ink group-hover:scale-105"
          style={{ width: size * 0.42, height: size * 0.42, boxShadow: 'var(--shadow-hard-sm)' }}
        >
          <MicIcon className="h-1/2 w-1/2" />
        </span>
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------------
   Sliced headline (brief 6.2). Two stacked copies: top half and
   bottom half, the bottom shifted 3px right, like a cut word.
   Used once per page at most.
   --------------------------------------------------------------- */
export function SlicedHeadline({
  text,
  highlight,
  color = 'var(--ss-white)',
  accent = 'var(--ss-green)',
  className = '',
}: {
  text: string;
  highlight?: string;   // one word drawn in the accent colour
  color?: string;
  accent?: string;
  className?: string;
}) {
  // Both halves use the same high-contrast colour, so every letter stays
  // whole and readable; the "blade cut" is only the 3px sideways shift.
  const content = (() => {
    if (!highlight || !text.includes(highlight)) return text;
    const [before, after] = text.split(highlight);
    return (
      <>
        {before}
        <span style={{ color: accent }}>{highlight}</span>
        {after}
      </>
    );
  })();
  // The mask repeats every line (line-height 1.05em), so every wrapped
  // line gets its own cut no matter how the headline breaks.
  const cut = '0.6em';
  const topMask = `repeating-linear-gradient(to bottom, #000 0 ${cut}, transparent ${cut} 1.05em)`;
  const bottomMask = `repeating-linear-gradient(to bottom, transparent 0 ${cut}, #000 ${cut} 1.05em)`;
  return (
    <h1 className={`relative font-extrabold ${className}`} style={{ lineHeight: 1.05, letterSpacing: '-0.03em' }}>
      {/* real text for screen readers and layout */}
      <span style={{ color, display: 'block', maskImage: topMask, WebkitMaskImage: topMask }}>{content}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ color, transform: 'translateX(3px)', maskImage: bottomMask, WebkitMaskImage: bottomMask }}
      >
        {content}
      </span>
    </h1>
  );
}
