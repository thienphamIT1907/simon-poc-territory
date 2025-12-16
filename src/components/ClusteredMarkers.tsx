import { useCallback, useEffect, useRef } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";

interface FsaMarkerData {
  center: google.maps.LatLngLiteral;
  fsaId: string;
}

interface ClusteredMarkersProps {
  markers: FsaMarkerData[];
  hoveredFsaId: string | null;
  selectedFsaId: string | null;
  onHoverFsa: (fsaId: string | null) => void;
  onSelectFsa: (fsaId: string | null) => void;
  onRenderComplete?: () => void;
  maxZoom?: number;
}

// Custom cluster renderer for better styling
function createClusterRenderer() {
  return {
    render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
      // Scale size based on count
      const size = Math.min(60, 30 + Math.log2(count) * 8);
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        content: createClusterContent(count, size),
        zIndex: 1000 + count,
      });

      return marker;
    },
  };
}

function createClusterContent(count: number, size: number): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size}px;
    height: ${size}px;
    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: white;
    font-weight: bold;
    font-size: ${Math.max(12, size / 3)}px;
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  div.textContent = count.toString();
  
  // Add hover effect
  div.addEventListener("mouseenter", () => {
    div.style.transform = "scale(1.1)";
  });
  div.addEventListener("mouseleave", () => {
    div.style.transform = "scale(1)";
  });
  
  return div;
}

export function ClusteredMarkers({
  markers,
  hoveredFsaId,
  selectedFsaId,
  onHoverFsa,
  onSelectFsa,
  onRenderComplete,
  maxZoom = 4, // Default per user request "smaller than 4" (meaning level <= 4)
}: ClusteredMarkersProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markerElementsRef = useRef<Map<string, Marker>>(new Map());

  // Initialize the clusterer
  useEffect(() => {
    if (!map) return;

    // Create the clusterer with custom renderer
    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      renderer: createClusterRenderer(),
      algorithmOptions: {
        maxZoom: maxZoom, // Stop clustering after this zoom level
      },
    });

    // Capture ref for cleanup
    const markerElements = markerElementsRef.current;

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current.setMap(null);
      }
      markerElements.clear();
    };
  }, [map, maxZoom]);

  // Update clusterer when markers prop changes or map changes
  useEffect(() => {
    if (!clustererRef.current) return;

    // Use requestIdleCallback for better performance
    // Falls back to setTimeout if not available
    const updateMarkersIdle = () => {
      if (clustererRef.current) {
        const markerArray = Array.from(markerElementsRef.current.values());
        
        // Only update if we have markers to show or need to clear
        clustererRef.current.clearMarkers();
        if (markerArray.length > 0) {
          clustererRef.current.addMarkers(markerArray);
        }
        
        // Signal render completion after markers are added to clusterer
        if (onRenderComplete) {
          onRenderComplete();
        }
      }
    };

    const idleId = typeof window !== "undefined" && "requestIdleCallback" in window
      ? window.requestIdleCallback(updateMarkersIdle, { timeout: 150 })
      : setTimeout(updateMarkersIdle, 100);

    return () => {
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId as number);
      } else {
        clearTimeout(idleId as number);
      }
    };
  }, [markers, map, onRenderComplete]);

  // Callback to register marker refs - uses ref instead of state to avoid re-renders
  const setMarkerRef = useCallback((marker: Marker | null, fsaId: string) => {
    if (marker) {
      markerElementsRef.current.set(fsaId, marker);
    } else {
      markerElementsRef.current.delete(fsaId);
    }
  }, []);

  return (
    <>
      {markers.map((markerData) => {
        const isHovered = markerData.fsaId === hoveredFsaId;
        const isSelected = markerData.fsaId === selectedFsaId;
        return (
          <AdvancedMarker
            key={markerData.fsaId}
            position={markerData.center}
            ref={(marker) => setMarkerRef(marker, markerData.fsaId)}
            title={`FSA: ${markerData.fsaId}`}
            onMouseEnter={() => onHoverFsa(markerData.fsaId)}
            onMouseLeave={() => onHoverFsa(null)}
            onClick={() => onSelectFsa(markerData.fsaId)}
          >
            <div
              className={`
                text-xs px-2 py-1 rounded-md shadow-lg font-semibold whitespace-nowrap
                transition-all duration-300 ease-out cursor-pointer
                ${
                  isSelected
                    ? "bg-emerald-600 text-white scale-150 shadow-xl ring-2 ring-white animate-bounce"
                    : isHovered
                      ? "bg-rose-600 text-white scale-150 shadow-xl"
                      : "bg-slate-800/90 text-white opacity-70"
                }
              `}
            >
              {markerData.fsaId}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

