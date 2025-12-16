import { useCallback, useEffect, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface UseZoomLevelResult {
  zoomLevel: number;
}

/**
 * Hook to track the current map zoom level
 */
export const useZoomLevel = (): UseZoomLevelResult => {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState<number>(4);

  const handleZoomChange = useCallback(() => {
    if (map) {
      const zoom = map.getZoom();
      if (zoom !== undefined) {
        setZoomLevel(zoom);
      }
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // Set initial zoom (wrapped to avoid sync setState)
    queueMicrotask(() => {
      handleZoomChange();
    });

    // Listen for zoom changes
    const listener = map.addListener("zoom_changed", handleZoomChange);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, handleZoomChange]);

  return { zoomLevel };
};
