import { useEffect, useRef, useState } from "react";

interface UseVisibleMapOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useVisibleMap(options: UseVisibleMapOptions = {}) {
  const { threshold = 0.1, rootMargin = "0px" } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return {
    containerRef,
    isVisible,
    hasBeenVisible,
  };
}
