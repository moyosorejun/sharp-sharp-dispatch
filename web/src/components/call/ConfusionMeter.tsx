import { CONFUSION_LABELS } from '../../call/types';

/* ---------------------------------------------------------------
   Confusion meter (brief 8.2). Four package-shaped segments that
   light up in their confusion colour, with a small bounce, plus a
   Space Mono score counter.
   --------------------------------------------------------------- */
export function ConfusionMeter({ score }: { score: number | null }) {
  const value = score ?? 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label text-teal">Confusion</p>
          <p className="font-display mt-1 text-[22px] font-extrabold">
            {score === null ? 'Waiting' : CONFUSION_LABELS[value]}
          </p>
        </div>
        <p className="font-mono text-3xl font-bold" aria-label={`Confusion score ${value} of 3`}>
          {value}
          <span className="text-ink/45"> / 3</span>
        </p>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Confusion levels">
        {CONFUSION_LABELS.map((label, i) => {
          const lit = score !== null && i <= value;
          return (
            <li key={label} className="flex flex-col items-center gap-1.5">
              <span
                // key change replays the bounce when a segment lights up
                key={lit ? 'on' : 'off'}
                className={`relative block h-9 w-full rounded-[8px] border-2 border-ink ${lit ? 'seg-lit' : 'bg-white'}`}
                style={lit ? { background: `var(--conf-${i})`, animationDelay: `${i * 70}ms` } : undefined}
                aria-hidden="true"
              >
                {/* tape stripe, so each segment reads as a little package */}
                <span className={`absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 ${lit ? 'bg-ink/20' : 'bg-ink/10'}`} />
              </span>
              <span className={`text-[12px] font-bold ${lit ? 'text-ink' : 'text-ink/50'}`}>
                {label}
                <span className="sr-only">{lit ? ' (reached)' : ''}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
