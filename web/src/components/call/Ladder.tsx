import { useLayoutEffect, useRef, useState } from 'react';
import { PackageIcon } from '../Package';

/* ---------------------------------------------------------------
   Explanation ladder (brief 8.3). Vertical stepper, L3 at the top.
   The current rung gets a hard-shadow card; a package climbs the
   rail to it. At L3 the rung turns Magenta.
   --------------------------------------------------------------- */
const RUNGS = [
  { level: 0, title: 'Normal answer', body: 'Short and direct.' },
  { level: 1, title: 'Smaller steps', body: 'One idea at a time, then "You dey follow?"' },
  { level: 2, title: 'Analogy', body: 'A Naija picture: bus park, danfo, market.' },
  { level: 3, title: 'Human handoff', body: 'A person calls you back.' },
];

export function Ladder({ level }: { level: number | null }) {
  const current = level ?? 0;
  const ordered = [...RUNGS].reverse(); // L3 on top
  // the package slides to the middle of the current rung (measured, so rungs can wrap)
  const rungs = useRef<(HTMLLIElement | null)[]>([]);
  const [y, setY] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const el = rungs.current[3 - current];
      if (el) setY(el.offsetTop + el.offsetHeight / 2 - 16);
    };
    measure();
    const ro = new ResizeObserver(measure);
    rungs.current.forEach((r) => r && ro.observe(r));
    return () => ro.disconnect();
  }, [current]);

  return (
    <div>
      <p className="label text-teal">Explanation ladder</p>
      <div className="relative mt-3 pl-11">
        {/* rail */}
        <span aria-hidden="true" className="absolute bottom-4 left-[15px] top-4 w-[3px] rounded-full bg-ink/15" />
        {/* the climbing package */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 grid h-8 w-8 place-items-center transition-transform duration-[400ms]"
          style={{
            transform: `translateY(${y}px)`,
            transitionTimingFunction: 'var(--ease-pop)',
            opacity: level === null ? 0.35 : 1,
          }}
        >
          <PackageIcon className="h-8 w-8" />
        </span>

        <ol className="flex flex-col gap-1" aria-label="Explanation levels, highest first">
          {ordered.map((r, i) => {
            const active = level !== null && r.level === current;
            const passed = level !== null && r.level < current;
            const isL3 = r.level === 3;
            return (
              <li
                key={r.level}
                ref={(el) => {
                  rungs.current[i] = el;
                }}
                className="flex items-center"
                aria-current={active ? 'step' : undefined}
              >
                <div
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] border-2 px-3 py-1.5 transition-[transform,opacity] duration-300 ${
                    active
                      ? `${isL3 ? 'border-magenta' : 'border-ink'} bg-white shadow-[var(--shadow-hard-sm)]`
                      : 'border-transparent'
                  } ${!active && !passed ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`font-mono grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink text-[13px] font-bold ${
                      active || passed ? 'text-ink' : 'bg-white text-ink'
                    }`}
                    style={active || passed ? { background: `var(--conf-${r.level})` } : undefined}
                  >
                    L{r.level}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold leading-tight">{r.title}</span>
                    <span className="block text-[13px] leading-snug text-ink/70">{r.body}</span>
                  </span>
                  {active && isL3 && <span className="ml-auto h-3 w-3 shrink-0 rounded-full bg-magenta" aria-hidden="true" />}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
