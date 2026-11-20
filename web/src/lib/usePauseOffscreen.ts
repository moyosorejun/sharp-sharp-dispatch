import { useEffect, useRef } from 'react';

/* Marks an element with data-offscreen while it is out of view, so CSS
   can pause its looping animations (see index.css). No re-renders. */
export function usePauseOffscreen<T extends Element>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.removeAttribute('data-offscreen');
        else el.setAttribute('data-offscreen', '');
      },
      { rootMargin: '100px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
