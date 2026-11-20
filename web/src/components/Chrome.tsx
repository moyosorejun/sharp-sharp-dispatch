import { Link, NavLink } from 'react-router-dom';
import { Button, MicIcon } from './ui';
import { PackageIcon } from './Package';
import { config } from '../config';

export function Wordmark({ light = true }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Sharp Sharp Dispatch, home">
      <PackageIcon className="h-8 w-8" />
      <span className={`font-display text-[17px] font-extrabold sm:text-lg ${light ? 'text-white' : 'text-ink'}`}>Sharp Sharp</span>
    </Link>
  );
}

export function Nav({ light = true, cta = true }: { light?: boolean; cta?: boolean }) {
  const link = `hidden rounded-full px-3 py-1.5 text-[15px] font-medium md:inline-block ${
    light ? 'text-white/85 hover:text-white' : 'text-ink/80 hover:text-ink'
  }`;
  return (
    <header className="relative z-20 shrink-0">
      <a href="#main" className="sr-only-focusable absolute left-4 top-2 rounded-full bg-mint px-4 py-2 font-bold text-ink">
        Skip to content
      </a>
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-5 sm:px-6" aria-label="Main">
        <Wordmark light={light} />
        <div className="flex items-center gap-1 sm:gap-2">
          <a href="/#how" className={link}>How it works</a>
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
          {config.githubUrl && (
            <a href={config.githubUrl} className={link} target="_blank" rel="noreferrer">GitHub</a>
          )}
          {cta && (
            <Button to="/call" className="ml-2" icon={<MicIcon className="h-4 w-4" />}>
              Talk to Ada
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="pinstripes relative border-t-2 border-ink text-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md">
          <Wordmark />
          <p className="mt-4 text-[15px] text-white/80">
            Sharp Sharp Dispatch is a fictional company built as a demo by Moyosore Junaid.
          </p>
        </div>
        <div className="flex gap-3">
          {config.githubUrl && <Button variant="secondary" href={config.githubUrl}>GitHub</Button>}
          {config.linkedinUrl && <Button variant="secondary" href={config.linkedinUrl}>LinkedIn</Button>}
        </div>
      </div>
    </footer>
  );
}
