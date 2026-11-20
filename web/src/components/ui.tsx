import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* ---------------------------------------------------------------
   Button (brief 8.7)
   primary: Naija Green + Ink text. secondary: White. live: Magenta + bold White.
   Pass `to` for an in-app link, `href` for an external one.
   --------------------------------------------------------------- */
type Variant = 'primary' | 'secondary' | 'live';
type Size = 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary: 'bg-green text-ink',
  secondary: 'bg-white text-ink',
  live: 'bg-magenta text-white text-[19px]!',
};
const sizeClass: Record<Size, string> = {
  md: 'px-5 py-2.5 text-[15px]',
  lg: 'px-7 py-3.5 text-[17px]',
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  to?: string;
  href?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<'button'>, 'className' | 'children'>;

export function Button({ variant = 'primary', size = 'md', to, href, icon, className = '', children, ...rest }: ButtonProps) {
  const cls = `press inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap ${variantClass[variant]} ${sizeClass[size]} ${className}`;
  const inner = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} className={cls} target="_blank" rel="noreferrer">{inner}</a>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

/* ---------------------------------------------------------------
   Chip (brief 8.7): pill, 12px uppercase, 1.5px Ink border.
   tone picks the fill; confusion levels use conf0..conf3.
   --------------------------------------------------------------- */
export type ChipTone = 'white' | 'cream' | 'green' | 'mint' | 'yellow' | 'magenta' | 'ink' | 'conf0' | 'conf1' | 'conf2' | 'conf3';

const chipTone: Record<ChipTone, string> = {
  white: 'bg-white text-ink',
  cream: 'bg-cream text-ink',
  green: 'bg-green text-ink',
  mint: 'bg-mint text-ink',
  yellow: 'bg-yellow text-ink',
  magenta: 'bg-white text-ink',
  ink: 'bg-ink text-white border-white!',
  conf0: 'bg-[var(--conf-0)] text-ink',
  conf1: 'bg-[var(--conf-1)] text-ink',
  conf2: 'bg-[var(--conf-2)] text-ink',
  conf3: 'bg-white text-ink',
};

export function Chip({ tone = 'white', className = '', children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span className={`label inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-ink px-2.5 py-0.5 leading-5 ${chipTone[tone]} ${className}`}>
      {/* magenta fails contrast behind 12px text, so it shows as a swatch instead */}
      {(tone === 'magenta' || tone === 'conf3') && (
        <span className="h-2.5 w-2.5 rounded-full border border-ink bg-magenta" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------
   Card: rounded, 2px Ink border, hard shadow.
   --------------------------------------------------------------- */
type CardTone = 'white' | 'cream' | 'mint' | 'green' | 'yellow' | 'forest' | 'teal' | 'magenta';
const cardTone: Record<CardTone, string> = {
  white: 'bg-white text-ink',
  cream: 'bg-cream text-ink',
  mint: 'bg-mint text-ink',
  green: 'bg-green text-ink',
  yellow: 'bg-yellow text-ink',
  forest: 'bg-forest text-white',
  teal: 'bg-teal text-white',
  magenta: 'bg-magenta text-white',
};

export function Card({
  tone = 'white',
  as: Tag = 'div',
  className = '',
  children,
}: {
  tone?: CardTone;
  as?: 'div' | 'article' | 'section' | 'li';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`rounded-[var(--radius-md)] border-2 border-ink shadow-[var(--shadow-hard)] ${cardTone[tone]} ${className}`}>
      {children}
    </Tag>
  );
}

/* Small line icons, drawn for this project. */
export function MicIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}
