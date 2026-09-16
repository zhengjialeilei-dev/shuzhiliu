import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { key, pathname } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const previousPath = useRef(pathname);
  const lastPosition = useRef(0);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  // This component lives above route/Suspense boundaries so list positions
  // survive opening a work; delayed content can grow before restoration ends.
  useLayoutEffect(() => {
    const samePage = previousPath.current === pathname;
    const target = navigationType === 'POP'
      ? positions.current.get(key) ?? 0
      : samePage ? lastPosition.current : 0;
    previousPath.current = pathname;
    let restoring = true;
    const save = () => {
      if (restoring) return;
      lastPosition.current = window.scrollY;
      positions.current.set(key, window.scrollY);
      if (positions.current.size > 50) positions.current.delete(positions.current.keys().next().value!);
    };
    const stop = () => { restoring = false; observer?.disconnect(); save(); };
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ top: target, left: 0, behavior: 'auto' });
      if (document.documentElement.scrollHeight - window.innerHeight >= target) stop();
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore);
    observer?.observe(document.documentElement);
    restore();
    const frame = requestAnimationFrame(restore);
    const timer = window.setTimeout(stop, 2000);
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('scroll', save);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [key, navigationType, pathname]);

  return null;
}
