import { memo, useEffect, useRef, useMemo } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { Segment } from "../types/segment";
import mockOperators from "../mock/OP/mock-op.json";

// Default colors if mock data is missing them
const DEFAULT_COLORS = [
  "#dc2626", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#db2777", // pink
];

// Map operator IDs to color
function getOperatorColor(operatorId: string, index: number): string {
  const op = mockOperators.find((o) => o.id === operatorId) as any;
  if (op?.color) return op.color;
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

interface SegmentLayerProps {
  selectedFsaId: string | null;
  segments: Segment[];
}

export const SegmentLayer = memo(function SegmentLayer({
  selectedFsaId,
  segments,
}: SegmentLayerProps) {
  const map = useMap();
  const itemsRef = useRef<(google.maps.Polygon | google.maps.Circle)[]>([]);

  // Filter segments for current view
  const visibleSegments = useMemo(() => {
    if (!selectedFsaId) return [];
    return segments.filter((s) => s.fsaId === selectedFsaId);
  }, [segments, selectedFsaId]);

  useEffect(() => {
    if (!map) return;

    // Clear existing items
    itemsRef.current.forEach((item) => item.setMap(null));
    itemsRef.current = [];

    // Create new items
    visibleSegments.forEach((segment, index) => {
      if (!segment.geometry) return;

      const color = getOperatorColor(segment.operatorId, index);
      const commonOptions = {
        fillColor: color,
        fillOpacity: 0.3,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: true,
        map,
        zIndex: 10, // Ensure on top of FSA polygons
      };

      if (segment.geometry.type === "Circle" && segment.geometry.center) {
        const circle = new google.maps.Circle({
          ...commonOptions,
          center: segment.geometry.center,
          radius: segment.geometry.radius || 500,
        });

        // Add listeners if needed (hover, click) - can add later
        
        itemsRef.current.push(circle);
      } else if (
        segment.geometry.type === "Polygon" &&
        segment.geometry.coordinates
      ) {
        const polygon = new google.maps.Polygon({
          ...commonOptions,
          paths: segment.geometry.coordinates,
        });
        
        itemsRef.current.push(polygon);
      }
    });

    return () => {
      itemsRef.current.forEach((item) => item.setMap(null));
      itemsRef.current = [];
    };
  }, [map, visibleSegments]);

  return null;
});
