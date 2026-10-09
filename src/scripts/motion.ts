/**
 * Motion helpers. GSAP is loaded lazily, after the page is idle, and only
 * where something animates in response to the visitor. Content is complete
 * and correct before any of this runs; if GSAP never loads, or the visitor
 * prefers reduced motion, values simply update in place.
 */
import type { gsap as GsapType } from 'gsap';

type Gsap = typeof GsapType;

let gsapInstance: Gsap | null = null;
let loading: Promise<Gsap | null> | null = null;

export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function loadGsap(): Promise<Gsap | null> {
  if (reducedMotion()) return Promise.resolve(null);
  loading ??= import('gsap')
    .then((m) => (gsapInstance = m.gsap))
    .catch(() => null);
  return loading;
}

/** Start fetching GSAP once the browser is idle, so the first interaction animates. */
export function warmGsap(): void {
  if (reducedMotion()) return;
  const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
  idle(() => void loadGsap());
}

/** The loaded GSAP instance, or null when motion is off or it has not loaded yet. */
export const motion = (): Gsap | null => (reducedMotion() ? null : gsapInstance);

const active = new WeakMap<HTMLElement, { kill: () => void }>();
const shown = new WeakMap<HTMLElement, number>();

/**
 * Show `to` in `el`, counting from whatever value is currently displayed.
 * The starting value comes from a previous call, or from the element's
 * data-value attribute (rendered on the server). A new call on the same
 * element takes over from the running tween without a jump. Without GSAP,
 * or with reduced motion, the final text is written immediately.
 */
export function tweenNumber(el: HTMLElement, to: number, format: (n: number) => string, duration = 0.45): void {
  const from = shown.get(el) ?? Number(el.dataset.value);
  active.get(el)?.kill();
  active.delete(el);
  el.dataset.value = String(to);

  const g = motion();
  if (!g || !Number.isFinite(from) || from === to) {
    shown.set(el, to);
    el.textContent = format(to);
    return;
  }
  const state = { v: from };
  const tween = g.to(state, {
    v: to,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      shown.set(el, state.v);
      el.textContent = format(state.v);
    },
    onComplete: () => {
      shown.set(el, to);
      el.textContent = format(to);
      active.delete(el);
    },
  });
  active.set(el, { kill: () => tween.kill() });
}

/** Stop any count running on `el` and forget its value (e.g. when showing "—"). */
export function stopTween(el: HTMLElement): void {
  active.get(el)?.kill();
  active.delete(el);
  shown.delete(el);
  delete el.dataset.value;
}
