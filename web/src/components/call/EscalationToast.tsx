import { useEffect } from 'react';
import type { Escalation } from '../../call/types';

/* ---------------------------------------------------------------
   Escalation toast (brief 8.6). Magenta card that drops in from the
   top right and leaves after 8 seconds. White text on Magenta is kept
   at 19px bold so it passes contrast as large text.
   --------------------------------------------------------------- */
export function EscalationToast({ escalation, onClose }: { escalation: Escalation | null; onClose: () => void }) {
  useEffect(() => {
    if (!escalation) return;
    const t = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(t);
  }, [escalation, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-end sm:left-auto sm:right-6 sm:top-6" role="status" aria-live="polite">
      {escalation && (
        <div
          key={escalation.id}
          className="anim-drop pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-[var(--radius-md)] border-2 border-ink bg-magenta p-5 text-white shadow-[var(--shadow-hard)]"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <p className="text-[19px] font-bold leading-snug">
            Ada don call human. Ticket <span className="font-mono">#{escalation.id}</span>. Person go call you back within 2 hours.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white hover:bg-ink/20"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
