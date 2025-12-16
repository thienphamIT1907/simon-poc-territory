import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { ConvertedPolygon } from "../types";

interface PolygonBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface PolygonWithBounds extends ConvertedPolygon {
  bounds: PolygonBounds;
}

/**
 * Calculate bounding box for a polygon
 */
function calculatePolygonBounds(polygon: ConvertedPolygon): PolygonBounds {
  const allPoints: google.maps.LatLngLiteral[] = [];
  
  if (polygon.isMultiPolygon) {
    // MultiPolygon: coordinates is LatLngLiteral[][][]
    const multiCoords = polygon.coordinates as google.maps.LatLngLiteral[][][];
    for (const polygonPart of multiCoords) {
      for (const ring of polygonPart) {
        allPoints.push(...ring);
      }
    }
  } else {
    // Polygon: coordinates is LatLngLiteral[][]
    const polyCoords = polygon.coordinates as google.maps.LatLngLiteral[][];
    for (const ring of polyCoords) {
      allPoints.push(...ring);
    }
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const point of allPoints) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }

  return { north, south, east, west };
}

/**
 * Check if two bounding boxes intersect
 */
function boundsIntersect(
  a: PolygonBounds,
  b: google.maps.LatLngBoundsLiteral
): boolean {
  // No intersection if one box is entirely above, below, left, or right of the other
  if (a.south > b.north || a.north < b.south) return false;
  if (a.west > b.east || a.east < b.west) return false;
  return true;
}

// Safely handle requestIdleCallback for different environments
const safeRequestIdleCallback = (cb: () => void, timeout: number) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(cb, { timeout });
  }
  return setTimeout(cb, timeout);
};

const safeCancelIdleCallback = (id: number) => {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

interface UseViewportPolygonsOptions {
  /** Debounce delay in ms for bounds updates (default: 100) */
  debounceMs?: number;
  /** Padding to add around viewport bounds (default: 0.1 degrees) */
  viewportPadding?: number;
}

interface UseViewportPolygonsResult {
  /** Polygons visible in the current viewport */
  visiblePolygons: ConvertedPolygon[];
  /** All polygons with pre-calculated bounds */
  polygonsWithBounds: PolygonWithBounds[];
  /** Current map bounds */
  mapBounds: google.maps.LatLngBoundsLiteral | null;
  /** Whether bounds are being updated */
  isUpdating: boolean;
}

/**
 * Hook to manage viewport-based polygon visibility
 * Only returns polygons that intersect with the current map viewport
 */
export function useViewportPolygons(
  polygons: ConvertedPolygon[],
  options: UseViewportPolygonsOptions = {}
): UseViewportPolygonsResult {
  const { debounceMs = 100, viewportPadding = 0.1 } = options;

  const map = useMap();
  const [mapBounds, setMapBounds] =
    useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  // Pre-calculate bounds for all polygons using useMemo (proper React way)
  const polygonsWithBounds = useMemo<PolygonWithBounds[]>(
    () =>
      polygons.map((polygon) => ({
        ...polygon,
        bounds: calculatePolygonBounds(polygon),
      })),
    [polygons]
  );

  // Reset bounds when polygons change to avoid filtering against old bounds (stale state)
  // This ensures that when switching provinces, we momentarily show ALL markers (safe default)
  // instead of showing NONE (because new polygons don't intersect old bounds).
  // We schedule this asynchronously to avoid cascading renders.
  useEffect(() => {
    const resetId = safeRequestIdleCallback(() => {
      setMapBounds(null);
    }, 0);

    return () => safeCancelIdleCallback(resetId);
  }, [polygons]);

  // Update map bounds with debouncing
  const updateBounds = useCallback(() => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    // Add padding to viewport for smoother experience when panning
    const paddedBounds: google.maps.LatLngBoundsLiteral = {
      north: ne.lat() + viewportPadding,
      south: sw.lat() - viewportPadding,
      east: ne.lng() + viewportPadding,
      west: sw.lng() - viewportPadding,
    };

    setMapBounds(paddedBounds);
    setIsUpdating(false);
  }, [map, viewportPadding]);

  // Set up bounds listener
  useEffect(() => {
    if (!map) return;

    // Initial bounds update - defer to avoid synchronous setState in effect
    const initialUpdateId = safeRequestIdleCallback(() => updateBounds(), 100);

    // Listen for bounds changes with debouncing
    const handleBoundsChanged = () => {
      setIsUpdating(true);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(updateBounds, debounceMs);
    };

    listenerRef.current = map.addListener(
      "bounds_changed",
      handleBoundsChanged
    );

    return () => {
      safeCancelIdleCallback(initialUpdateId);
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [map, updateBounds, debounceMs]);

  // Filter polygons by viewport
  // If mapBounds is null (initial load or province switch), show ALL to be safe
  const visiblePolygons = useMemo(
    () =>
      mapBounds
        ? polygonsWithBounds.filter((p) => boundsIntersect(p.bounds, mapBounds))
        : polygonsWithBounds,
    [mapBounds, polygonsWithBounds]
  );

  return {
    visiblePolygons,
    polygonsWithBounds,
    mapBounds,
    isUpdating,
  };
}
