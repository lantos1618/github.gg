import { useEffect, useRef, useCallback } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  onIntersect?: () => void;
  enabled?: boolean;
}

/**
 * Hook to handle intersection observer pattern
 * Useful for infinite scroll, lazy loading, etc.
 */
export function useIntersectionObserver({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  rootMargin = '0px',
}: UseIntersectionObserverOptions = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting && onIntersect) {
      onIntersect();
    }
  }, [onIntersect]);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    // Create observer if it doesn't exist
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold,
        rootMargin,
      });
    }

    // Observe element
    observerRef.current.observe(elementRef.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, handleIntersection, threshold, rootMargin]);

  return elementRef;
}
