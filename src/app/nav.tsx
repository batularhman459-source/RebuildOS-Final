import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * iPhone-style navigation for a web app:
 *  - pages slide in from the right when you go deeper and slide back when you return
 *    (Safari's View Transitions; a plain switch where they're missing or motion is reduced),
 *  - one way back from every page (history when there is some, else the page above),
 *  - swipe from the left edge to go back when running from the home screen, where iOS
 *    has no back gesture of its own.
 */

export type NavDirection = 'forward' | 'back' | 'fade';

/** Full-screen moments: they fade in and out instead of sliding. */
const MOMENTS = ['/checkin', '/done', '/focus', '/minimum', '/week', '/welcome', '/setup', '/close'];

/** How deep a page sits: tabs 0, pages from the sky 1, a goal or a day 2. Moments have none. */
export function depthOf(path: string): number | undefined {
  if (MOMENTS.some((p) => path.startsWith(p))) return undefined;
  if (path === '/' || path === '/sky') return 0;
  if (path.startsWith('/goal/') || path.startsWith('/day/')) return 2;
  return 1;
}

export function directionBetween(from: string, to: string): NavDirection {
  const a = depthOf(from);
  const b = depthOf(to);
  if (a === undefined || b === undefined || a === b) return 'fade';
  return b > a ? 'forward' : 'back';
}

/** Where "back" goes when there's no history to return to (the app was opened on this page). */
export function parentOf(path: string): string {
  if (path.startsWith('/goal/')) return '/plan';
  if (path.startsWith('/day/')) return '/journal';
  return '/sky';
}

type StartViewTransition = (update: () => Promise<void>) => { finished: Promise<void> };

function canAnimate(): boolean {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  return typeof start === 'function' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface NavApi {
  /** Go to a path (or -1 for back) with the right slide. */
  go: (to: string | -1, opts?: { replace?: boolean; state?: unknown }) => void;
  /** Back: history when there is some, otherwise the page above. */
  back: () => void;
}

const NavContext = createContext<NavApi | null>(null);

export function useNav(): NavApi {
  const api = useContext(NavContext);
  if (!api) throw new Error('useNav outside NavProvider');
  return api;
}

function hasHistory(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

export function NavProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pending = useRef<(() => void) | null>(null);
  const path = useRef(location.pathname);
  path.current = location.pathname;

  // The new page has rendered: give its data a moment to arrive, then let the slide run.
  useLayoutEffect(() => {
    const done = pending.current;
    if (!done) return;
    pending.current = null;
    window.setTimeout(done, 70);
  }, [location.key]);

  const transition = useCallback((dir: NavDirection, update: () => void) => {
    if (!canAnimate()) return update();
    const root = document.documentElement;
    root.dataset.nav = dir;
    const start = (document as Document & { startViewTransition: StartViewTransition }).startViewTransition.bind(document);
    const t = start(
      () =>
        new Promise<void>((resolve) => {
          pending.current = resolve;
          update();
          // Never leave the screen frozen if the page doesn't change.
          window.setTimeout(resolve, 450);
        }),
    );
    void t.finished.finally(() => {
      if (root.dataset.nav === dir) delete root.dataset.nav;
    });
  }, []);

  const go = useCallback<NavApi['go']>(
    (to, opts) => {
      if (to === -1) return transition('back', () => navigate(-1));
      if (to === path.current) return;
      transition(directionBetween(path.current, to), () => navigate(to, opts));
    },
    [navigate, transition],
  );

  const back = useCallback(() => {
    if (hasHistory()) go(-1);
    else {
      const to = parentOf(path.current);
      transition('back', () => navigate(to, { replace: true }));
    }
  }, [go, navigate, transition]);

  // Every in-app link gets the right slide: catch the click before the router does.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      go(url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [go]);

  // After a swipe the page has already slid away: go back without a second slide.
  const backNow = useCallback(() => {
    if (hasHistory()) navigate(-1);
    else navigate(parentOf(path.current), { replace: true });
  }, [navigate]);

  return (
    <NavContext.Provider value={{ go, back }}>
      {children}
      <SwipeBack onBack={backNow} />
    </NavContext.Provider>
  );
}

function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

/** Edge swipe from the left to go back, as in iOS apps (home-screen app only; Safari has its own). */
function SwipeBack({ onBack }: { onBack: () => void }) {
  const { pathname } = useLocation();
  const depth = depthOf(pathname);

  useEffect(() => {
    if (!isStandalone() || !depth) return;
    const main = document.querySelector('main');
    if (!main) return;
    let startX = 0;
    let startY = 0;
    let startT = 0;
    let dx = 0;
    let active = false;
    let decided = false;

    const reset = (animate: boolean) => {
      main.style.transition = animate ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : '';
      main.style.transform = '';
      main.style.boxShadow = '';
    };

    function start(e: TouchEvent) {
      const t = e.touches[0];
      if (!t || t.clientX > 24 || document.querySelector('[role="dialog"]')) return;
      active = true;
      decided = false;
      startX = t.clientX;
      startY = t.clientY;
      startT = performance.now();
      dx = 0;
    }
    function move(e: TouchEvent) {
      const t = e.touches[0];
      if (!active || !t) return;
      const x = t.clientX - startX;
      const y = t.clientY - startY;
      if (!decided) {
        if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
        decided = true;
        if (Math.abs(y) > Math.abs(x) || x < 0) {
          active = false;
          return;
        }
      }
      e.preventDefault();
      dx = Math.max(0, x);
      main!.style.transition = 'none';
      main!.style.transform = `translate3d(${dx}px, 0, 0)`;
      main!.style.boxShadow = '-12px 0 32px rgba(0, 0, 0, 0.45)';
    }
    function end() {
      if (!active) return;
      active = false;
      if (!decided) return;
      const fast = dx / Math.max(1, performance.now() - startT) > 0.5;
      if (dx > window.innerWidth * 0.33 || (fast && dx > 40)) {
        main!.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        main!.style.transform = `translate3d(${window.innerWidth}px, 0, 0)`;
        window.setTimeout(() => {
          reset(false);
          onBack();
        }, 200);
      } else reset(true);
    }

    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    return () => {
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      reset(false);
    };
  }, [depth, onBack]);

  return null;
}
