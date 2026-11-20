/* ---------------------------------------------------------------
   Display-only fixes for common Pidgin mis-hearings in the caller's
   transcript. The raw transcript stays untouched in state; only the
   text drawn on screen goes through this.
   --------------------------------------------------------------- */
const FIXES: [RegExp, string][] = [
  [/\b(?:a|ah|uh) beg\b/gi, 'abeg'],
  [/\bwhat (?:in|ten|tin)\b/gi, 'wetin'],
  [/\bwhatin\b/gi, 'wetin'],
  [/\bwa ?ha ?l?la\b/gi, 'wahala'],
  [/\bwahalla\b/gi, 'wahala'],
  [/\bsabby\b/gi, 'sabi'],
  [/\b(?:o|oh) ya\b/gi, 'oya'],
  [/\bshay\b/gi, 'shey'],
  [/\bcome mot\b/gi, 'comot'],
  [/\bsharp sharp dispatch\b/gi, 'Sharp Sharp Dispatch'],
  [/\bS\.? ?S\.? ?D\b\.?/g, 'SSD'],
  [/\bSSD[\s-]*(1\d{3})\b/gi, 'SSD-$1'],
];

export function fixForDisplay(text: string): string {
  let out = text;
  for (const [re, to] of FIXES) {
    out = out.replace(re, (match, ...groups) => {
      const rep = to.replace(/\$(\d)/g, (_, n) => String(groups[Number(n) - 1] ?? ''));
      // keep a capital at the start of a sentence
      return /^[A-Z]/.test(match) && /^[a-z]/.test(rep) ? rep[0].toUpperCase() + rep.slice(1) : rep;
    });
  }
  return out;
}
