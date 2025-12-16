import { useCallback, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface TransitionOptions {
  /** Duration in ms for the transition (default: 500) */
  duration?: number;
  /** Minimum zoom level to enforce */
  minZoom?: number;
}

interface UseMapTransitionResult {
  /** Smoothly animate to new bounds */
  animateToBounds: (
    bounds: google.maps.LatLngBoundsLiteral,
    padding?: google.maps.Padding,
    options?: TransitionOptions
  ) => void;
  /** Smoothly animate to center and zoom */
  transitionTo: (
    center: google.maps.LatLngLiteral,
    zoom: number,
    options?: TransitionOptions
  ) => void;
  /** Cancel any ongoing animation */
  cancelTransition: () => void;
  /** Whether a transition is currently in progress */
  isTransitioning: boolean;
}

/**
 * Hook for smooth map transitions with animation support
 * Uses map idle listener instead of setTimeout for reliable behavior
 */
export function useMapTransition(): UseMapTransitionResult {
  const map = useMap();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const idleListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const cancelTransition = useCallback(() => {
    if (idleListenerRef.current) {
      google.maps.event.removeListener(idleListenerRef.current);
      idleListenerRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  const animateToBounds = useCallback(
    (
      bounds: google.maps.LatLngBoundsLiteral,
      padding?: google.maps.Padding,
      options: TransitionOptions = {}
    ) => {
      if (!map) return;

      const { minZoom = 5 } = options;

      // Cancel any existing transition
      cancelTransition();
      setIsTransitioning(true);

      // Fit to bounds with padding
      map.fitBounds(
        bounds,
        padding ?? { top: 50, right: 50, bottom: 50, left: 50 }
      );

      // Wait for map to become idle, then enforce min zoom
      idleListenerRef.current = google.maps.event.addListenerOnce(
        map,
        "idle",
        () => {
          const currentZoom = map.getZoom();
          if (currentZoom !== undefined && currentZoom < minZoom) {
            map.setZoom(minZoom);
          }
          setIsTransitioning(false);
          idleListenerRef.current = null;
        }
      );
    },
    [map, cancelTransition]
  );

  const transitionTo = useCallback(
    (
      center: google.maps.LatLngLiteral,
      zoom: number,
      options: TransitionOptions = {}
    ) => {
      if (!map) return;

      const { minZoom = 4 } = options;

      // Cancel any existing transition
      cancelTransition();
      setIsTransitioning(true);

      // Use panTo for smooth animation
      map.panTo(center);
      map.setZoom(Math.max(zoom, minZoom));

      // Wait for idle to confirm transition complete
      idleListenerRef.current = google.maps.event.addListenerOnce(
        map,
        "idle",
        () => {
          setIsTransitioning(false);
          idleListenerRef.current = null;
        }
      );
    },
    [map, cancelTransition]
  );

  return {
    animateToBounds,
    transitionTo,
    cancelTransition,
    isTransitioning,
  };
}
