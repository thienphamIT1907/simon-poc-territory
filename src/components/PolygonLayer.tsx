import { memo, useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { ConvertedPolygon } from "../types";
import { POLYGON_STYLES } from "../constants";

interface PolygonLayerProps {
  polygons: ConvertedPolygon[];
  hoveredFsaId: string | null;
  selectedFsaId: string | null;
  onHoverFsa: (fsaId: string | null) => void;
  onSelectFsa: (fsaId: string | null) => void;
  onRenderComplete?: () => void;
}

function PolygonLayerComponent({
  polygons,
  hoveredFsaId,
  selectedFsaId,
  onHoverFsa,
  onSelectFsa,
  onRenderComplete,
}: PolygonLayerProps) {
  const map = useMap();
  const polygonsRef = useRef<{ polygon: google.maps.Polygon; fsaId: string }[]>(
    []
  );

  // Update polygon styles when hoveredFsaId or selectedFsaId changes
  useEffect(() => {
    for (const { polygon, fsaId } of polygonsRef.current) {
      const isSelected = fsaId === selectedFsaId;
      const isHovered = fsaId === hoveredFsaId;
      
      // Selected takes priority, then hover, then default
      const style = isSelected 
        ? POLYGON_STYLES.selected
        : isHovered 
          ? POLYGON_STYLES.hover 
          : POLYGON_STYLES.default;

      polygon.setOptions({
        strokeColor: style.strokeColor,
        strokeOpacity: style.strokeOpacity,
        strokeWeight: style.strokeWeight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
      });
    }
  }, [hoveredFsaId, selectedFsaId]);

  useEffect(() => {
    if (!map) return;

    // Clear existing polygons
    for (const { polygon } of polygonsRef.current) {
      polygon.setMap(null);
    }
    polygonsRef.current = [];

    // Create new polygons
    for (const polygonData of polygons) {
      if (polygonData.isMultiPolygon) {
        // MultiPolygon: Need to create separate google.maps.Polygon for each part
        // because google.maps.Polygon represents a SINGLE polygon (with holes), not multiple areas
        const multiCoords = polygonData.coordinates as google.maps.LatLngLiteral[][][];
        
        for (const polygonPart of multiCoords) {
          // Each polygon part is an array of rings (first = outer, rest = holes)
          const paths = polygonPart.map((ring) =>
            ring.map((coord) => new google.maps.LatLng(coord.lat, coord.lng))
          );

          const polygon = new google.maps.Polygon({
            paths,
            strokeColor: POLYGON_STYLES.default.strokeColor,
            strokeOpacity: POLYGON_STYLES.default.strokeOpacity,
            strokeWeight: POLYGON_STYLES.default.strokeWeight,
            fillColor: POLYGON_STYLES.default.fillColor,
            fillOpacity: POLYGON_STYLES.default.fillOpacity,
            map,
          });

          // Add hover listeners
          polygon.addListener("mouseover", () => {
            onHoverFsa(polygonData.fsaId);
          });

          polygon.addListener("mouseout", () => {
            onHoverFsa(null);
          });

          // Add click listener for selection (toggle)
          polygon.addListener("click", () => {
            onSelectFsa(polygonData.fsaId);
          });

          polygonsRef.current.push({ polygon, fsaId: polygonData.fsaId });
        }
      } else {
        // Simple Polygon: Single polygon with rings (first = outer, rest = holes)
        const polyCoords = polygonData.coordinates as google.maps.LatLngLiteral[][];
        const paths = polyCoords.map((ring) =>
          ring.map((coord) => new google.maps.LatLng(coord.lat, coord.lng))
        );

        const polygon = new google.maps.Polygon({
          paths,
          strokeColor: POLYGON_STYLES.default.strokeColor,
          strokeOpacity: POLYGON_STYLES.default.strokeOpacity,
          strokeWeight: POLYGON_STYLES.default.strokeWeight,
          fillColor: POLYGON_STYLES.default.fillColor,
          fillOpacity: POLYGON_STYLES.default.fillOpacity,
          map,
        });

        // Add hover listeners
        polygon.addListener("mouseover", () => {
          onHoverFsa(polygonData.fsaId);
        });

        polygon.addListener("mouseout", () => {
          onHoverFsa(null);
        });

        // Add click listener for selection (toggle)
        polygon.addListener("click", () => {
          onSelectFsa(polygonData.fsaId);
        });

        polygonsRef.current.push({ polygon, fsaId: polygonData.fsaId });
      }
    }

    // Signal render completion after all polygons are created
    if (onRenderComplete) {
      // Use small delay to ensure all polygons are added to map
      const timer = setTimeout(() => {
        onRenderComplete();
      }, 50);
      
      return () => {
        for (const { polygon } of polygonsRef.current) {
          polygon.setMap(null);
        }
        polygonsRef.current = [];
        clearTimeout(timer);
      };
    }

    // Cleanup on unmount
    return () => {
      for (const { polygon } of polygonsRef.current) {
        polygon.setMap(null);
      }
      polygonsRef.current = [];
    };
  }, [map, polygons, onHoverFsa, onSelectFsa, onRenderComplete]);

  return null;
}

export const PolygonLayer = memo(PolygonLayerComponent);
