import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Line, Turn } from '../../call/types';
import { SIGNAL_WORDS } from '../../call/types';
import { fixForDisplay } from '../../call/displayFix';
import { Chip, type ChipTone } from '../ui';

/* ---------------------------------------------------------------
   Live transcript (brief 8.4). Ada on the left in Mint, caller on
   the right in White. Caller bubbles carry a language chip and, when
   confusion was detected, a coloured dot plus the signal in words.
   Auto-scroll only follows if the reader is already at the bottom,
   so motion never pulls text away from someone reading.
   --------------------------------------------------------------- */
const LANG: Record<string, string> = { english: 'English', pidgin: 'Pidgin', mixed: 'Mixed' };

export function Transcript({ lines, turns, className = '' }: { lines: Line[]; turns: Turn[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // a bubble whose only partial was dropped (noise) has nothing to show
  const shown = lines.filter((l) => l.text || l.partial);
  // Chips: each caller bubble knows its logged turn (line.turn). If none do
  // (log_turn calls never reached the browser), fall back to counting.
  const tagged = shown.some((l) => l.turn !== undefined);
  let callerIndex = -1;
  let lastLang: Line['lang'];

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines, turns]);

  return (
    <div ref={box} className={`overflow-y-auto overscroll-contain ${className}`} tabIndex={0} aria-label="Call transcript">
      {shown.length === 0 ? (
        <p className="grid h-full min-h-40 place-items-center px-6 text-center text-ink/60">Ada never talk yet. Tap the orb to start.</p>
      ) : (
        <ol className="flex flex-col gap-3 p-4" role="log" aria-live="polite">
          {shown.map((line) => {
            const isAda = line.speaker === 'ada';
            let turn: Turn | undefined;
            if (!isAda && line.text) {
              callerIndex += 1;
              turn = tagged ? (line.turn !== undefined ? turns[line.turn] : undefined) : turns[callerIndex];
            }
            // Caller text, best first: Ada's correctly spelled version from
            // log_turn, else the raw transcript with display-only fixes
            // (skipped once the caller is known to be speaking English).
            const lang = line.lang ?? lastLang;
            if (!isAda && line.lang) lastLang = line.lang;
            const fix = (t: string) => (isAda || lang === 'english' ? t : fixForDisplay(t));
            const body = !isAda && line.said ? line.said : line.text && fix(line.text);
            const typingOnly = !line.text && !!line.partial;
            return (
              <li key={line.id} className={`flex flex-col ${isAda ? 'items-start' : 'items-end'}`}>
                <span className="label mb-1 text-ink/55">{isAda ? 'Ada' : 'You'}</span>
                <p
                  className={`max-w-[88%] rounded-[var(--radius-md)] border-2 border-ink px-4 py-2.5 text-[15px] leading-snug ${
                    isAda ? 'rounded-tl-[6px] bg-mint' : 'rounded-tr-[6px] bg-white'
                  } ${typingOnly || (!line.final && !line.partial) ? 'opacity-75' : ''}`}
                >
                  {body}
                  {line.partial ? (
                    <span className={`${line.text ? 'mt-1 block' : ''} italic text-ink/60`}>
                      {fix(line.partial)}
                      <span aria-hidden="true"> ...</span>
                    </span>
                  ) : (
                    !line.final && <span aria-hidden="true"> ...</span>
                  )}
                </p>
                {turn && <TurnChips turn={turn} />}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function TurnChips({ turn }: { turn: Turn }) {
  const signals = (turn.signals ?? []).map((s) => SIGNAL_WORDS[s] ?? s.replace(/_/g, ' '));
  if (turn.pause_ms && turn.pause_ms >= 3000) signals.push(`long pause (${(turn.pause_ms / 1000).toFixed(1)}s)`);
  const tone = `conf${turn.confusion_score}` as ChipTone;
  return (
    <div className="mt-1.5 flex max-w-[88%] flex-wrap justify-end gap-1.5">
      {turn.language && <Chip tone="cream">{LANG[turn.language] ?? turn.language}</Chip>}
      {turn.confusion_score > 0 && (
        <Chip tone={tone === 'conf3' ? 'conf3' : 'white'} className="normal-case tracking-normal">
          {tone !== 'conf3' && (
            <span
              className="h-2.5 w-2.5 rounded-full border border-ink"
              style={{ background: `var(--conf-${turn.confusion_score})` }}
              aria-hidden="true"
            />
          )}
          <span className="sr-only">Confusion {turn.confusion_score}: </span>
          {signals.length ? signals.join(', ') : 'unsure'}
        </Chip>
      )}
    </div>
  );
}
