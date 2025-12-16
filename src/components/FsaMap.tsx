import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Map as GoogleMap } from "@vis.gl/react-google-maps";
import { PolygonLayer } from "./PolygonLayer";
import { ClusteredMarkers } from "./ClusteredMarkers";
import { LduLayer } from "./LduLayer";
import type { ConvertedPolygon, ProvinceInfo } from "../types";
import { CANADA_CENTER, CANADA_ZOOM } from "../constants";

import { calculateBounds } from "../utils/coordinate-converter";
import { useMapTransition } from "../hooks/useMapTransition";
import { useViewportPolygons } from "../hooks/useViewportPolygons";
import { useLduData } from "../hooks/useLduData";
import { useZoomLevel } from "../hooks/useZoomLevel";
import { useUsedSegmentData } from "../hooks/useUsedSegmentData";
import { LoaderPinwheel } from "lucide-react";

import { SegmentLayer } from "./SegmentLayer";
import type { Segment } from "../types/segment";

interface FSAMapProps {
  polygons: ConvertedPolygon[];
  selectedProvince?: ProvinceInfo;
  isLoading: boolean;
  selectedFsaId?: string | null;
  onSelectFsa?: (fsaId: string | null) => void;
  selectedLdus?: string[];
  onSelectLdus?: (ldus: string[]) => void;
  segments: Segment[]; // New prop
}

// Minimum zoom level for the map
const MIN_ZOOM = 4;
// Zoom threshold - hide markers/clusters at zoom levels <= this value
const MARKER_HIDE_ZOOM = 6;

interface FsaMarkerData {
  center: google.maps.LatLngLiteral;
  fsaId: string;
}

// Component to handle map click events (outside markers)
// function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const listener = map.addListener("click", onMapClick);

//     return () => {
//       google.maps.event.removeListener(listener);
//     };
//   }, [map, onMapClick]);

//   return null;
// }

function FSAMapMemo({
  polygons,
  selectedProvince,
  isLoading,
  selectedFsaId: externalSelectedFsaId,
  onSelectFsa: externalOnSelectFsa,
  selectedLdus = [],
  onSelectLdus,
  segments,
}: FSAMapProps) {
  const [hoveredFsaId, setHoveredFsaId] = useState<string | null>(null);
  // Use external FSA selection if provided, otherwise use internal state
  const [internalSelectedFsaId, setInternalSelectedFsaId] = useState<string | null>(null);
  
  // Determine which FSA ID to use (external takes precedence)
  const selectedFsaId = externalSelectedFsaId ?? internalSelectedFsaId;

  // Render completion tracking
  const [polygonsRendered, setPolygonsRendered] = useState(false);
  const [markersRendered, setMarkersRendered] = useState(false);
  const [lduRendered, setLduRendered] = useState(false);

  // Get current zoom level
  const { zoomLevel } = useZoomLevel();

  // Load LDU data for the selected province and FSA
  const { lduMarkers, isLoading: isLduLoading } = useLduData({
    selectedProvince,
    selectedFsaId,
  });

  // Get used LDUs from created segments
  const { getUsedLdusArray } = useUsedSegmentData({ segments });
  const usedLdus = getUsedLdusArray();

  // Reset FSA selection when province changes
  useEffect(() => {
    queueMicrotask(() => {
      setInternalSelectedFsaId(null);
      if (externalOnSelectFsa) {
        externalOnSelectFsa(null);
      }
    });
  }, [selectedProvince?.code, externalOnSelectFsa]);

  // Reset render completion when data changes
  useEffect(() => {
    queueMicrotask(() => {
      setPolygonsRendered(false);
      setMarkersRendered(false);
      setLduRendered(false);
    });
  }, [selectedProvince?.code, polygons.length]);

  // Use custom hooks for smooth transitions and viewport culling
  const { animateToBounds, transitionTo, isTransitioning } = useMapTransition();
  const { visiblePolygons } = useViewportPolygons(polygons, {
    debounceMs: 150,
    viewportPadding: 0.2,
  });

  const handleHoverFsa = useCallback((fsaId: string | null) => {
    setHoveredFsaId(fsaId);
  }, []);

  // Toggle FSA selection - click same FSA to deselect
  const handleSelectFsa = useCallback((fsaId: string | null) => {
    const newValue = selectedFsaId === fsaId ? selectedFsaId : fsaId;
    
    // If external handler provided, use it
    if (externalOnSelectFsa) {
      externalOnSelectFsa(newValue);
    } else {
      setInternalSelectedFsaId(newValue);
    }
  }, [selectedFsaId, externalOnSelectFsa]);

  // Click on map (outside markers) to deselect FSA
  const handleMapClick = useCallback(() => {
    // if (externalOnSelectFsa) {
    //   externalOnSelectFsa(null);
    // } else {
    //   setInternalSelectedFsaId(null);
    // }
  }, [externalOnSelectFsa]);

  // Handle province transitions with smooth animations
  useEffect(() => {
    if (isLoading) return;

    if (selectedProvince) {
      const bounds = calculateBounds(polygons);

      if (bounds) {
        animateToBounds(
          bounds,
          { top: 50, right: 50, bottom: 50, left: 50 },
          { minZoom: MIN_ZOOM }
        );
      } else {
        transitionTo(
          selectedProvince.center,
          Math.max(selectedProvince.zoom, MIN_ZOOM)
        );
      }
    } else {
      transitionTo(CANADA_CENTER, CANADA_ZOOM);
    }
  }, [selectedProvince, polygons, isLoading, animateToBounds, transitionTo]);

  // Handle FSA selection zoom/pan - animate to FSA bounds when selected from external selector
  useEffect(() => {
    if (!selectedFsaId || isLoading) return;

    // Find the polygon(s) for the selected FSA
    const fsaPolygons = polygons.filter((p) => p.fsaId === selectedFsaId);
    
    if (fsaPolygons.length > 0) {
      // Calculate bounds for the selected FSA
      const fsaBounds = calculateBounds(fsaPolygons);
      
      if (fsaBounds) {
        // Zoom to FSA bounds with padding
        animateToBounds(
          fsaBounds,
          { top: 100, right: 100, bottom: 100, left: 100 },
          { minZoom: 10 }
        );
      } else {
        // Fallback: zoom to the center of the first polygon
        transitionTo(fsaPolygons[0].center, 12);
      }
    }
  }, [selectedFsaId, polygons, isLoading, animateToBounds, transitionTo]);

  // Visibility controls
  const shouldShowMarkers =
    !!selectedProvince && zoomLevel > MARKER_HIDE_ZOOM && !selectedFsaId;
  const shouldShowLdu = !!selectedFsaId && lduMarkers.length > 0;

  // When FSA is selected, only show that FSA's polygon (from all polygons, not just visible)
  // This ensures the selected FSA boundary stays visible regardless of zoom level
  const displayPolygons = useMemo(() => {
    if (selectedFsaId) {
      // Use full polygons array to ensure FSA stays visible at any zoom
      return polygons.filter((p) => p.fsaId === selectedFsaId);
    }
    return visiblePolygons;
  }, [polygons, visiblePolygons, selectedFsaId]);

  // Callbacks for render completion
  const handlePolygonsReady = useCallback(() => {
    setPolygonsRendered(true);
  }, []);

  const handleMarkersReady = useCallback(() => {
    setMarkersRendered(true);
  }, []);

  const handleLduReady = useCallback(() => {
    setLduRendered(true);
  }, []);

  // Determine if everything is fully rendered
  const isFullyRendered = useMemo(() => {
    if (!selectedProvince) return true;
    if (isLoading) return false;
    if (isTransitioning) return false;

    const polygonsReady = polygonsRendered || displayPolygons.length === 0;
    const markersReady = !shouldShowMarkers || markersRendered;
    const lduReady = !shouldShowLdu || lduRendered || isLduLoading;

    return polygonsReady && markersReady && lduReady;
  }, [
    selectedProvince,
    isLoading,
    isTransitioning,
    polygonsRendered,
    markersRendered,
    lduRendered,
    displayPolygons.length,
    shouldShowMarkers,
    shouldShowLdu,
    isLduLoading,
  ]);

  // FSA markers - only when showing markers
  const fsaMarkers = useMemo<FsaMarkerData[]>(() => {
    if (!shouldShowMarkers) return [];

    const fsaMap = new Map<string, FsaMarkerData>();

    for (const polygon of visiblePolygons) {
      if (!fsaMap.has(polygon.fsaId)) {
        fsaMap.set(polygon.fsaId, {
          center: polygon.center,
          fsaId: polygon.fsaId,
        });
      }
    }

    return [...fsaMap.values()];
  }, [visiblePolygons, shouldShowMarkers]);

  return (
    <div className="relative size-full">
      <GoogleMap
        defaultCenter={CANADA_CENTER}
        defaultZoom={CANADA_ZOOM}
        mapId="canada-provinces-map"
        gestureHandling={isFullyRendered ? "greedy" : "none"}
        className="size-full"
        minZoom={MIN_ZOOM}
        maxZoom={15}
        renderingType="VECTOR"
        reuseMaps
        disableDefaultUI
      >
        {/* Handle map click (outside markers) to deselect */}
        {/* <MapClickHandler onMapClick={handleMapClick} /> */}

        {/* Polygons - filtered when FSA selected */}
        <PolygonLayer
          polygons={displayPolygons}
          hoveredFsaId={hoveredFsaId}
          selectedFsaId={selectedFsaId}
          onHoverFsa={handleHoverFsa}
          onSelectFsa={handleSelectFsa}
          onRenderComplete={handlePolygonsReady}
        />

        {/* FSA Markers - hidden at low zoom or when FSA is selected */}
        {shouldShowMarkers && (
          <ClusteredMarkers
            markers={fsaMarkers}
            hoveredFsaId={hoveredFsaId}
            selectedFsaId={selectedFsaId}
            onHoverFsa={handleHoverFsa}
            onSelectFsa={handleSelectFsa}
            onRenderComplete={handleMarkersReady}
            maxZoom={12}
          />
        )}

        {/* LDU Layer - only when an FSA is selected */}
        {shouldShowLdu && (
          <LduLayer
            markers={lduMarkers}
            selectedLdus={selectedLdus}
            usedLdus={usedLdus}
            onSelectLdu={onSelectLdus}
            onRenderComplete={handleLduReady}
          />
        )}
        <SegmentLayer
        selectedFsaId={selectedFsaId}
        segments={segments}
      />
    </GoogleMap>

      {/* Selected FSA indicator - only show when using internal FSA selection (no external control) */}
      {selectedFsaId && !externalOnSelectFsa && (
        <div className="absolute top-4 left-4 bg-linear-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ">
          <div className="flex flex-col">
            <span className="text-xs text-emerald-200">Selected FSA</span>
            <span className="font-bold text-xl">{selectedFsaId}</span>
          </div>
          <div className="border-l border-white/30 pl-3">
            <span className="text-emerald-100">
              {lduMarkers.length.toLocaleString()} postal codes
            </span>
          </div>
          <button
            onClick={handleMapClick}
            className="ml-2 hover:bg-white/20 rounded-full p-2 transition-colors"
            title="Close LDU view"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zoom level indicator (debug) */}
      {selectedProvince && (
        <div className="absolute bottom-4 right-4 bg-slate-800/80 text-white text-xs px-2 py-1 rounded">
          Zoom: {zoomLevel.toFixed(1)}
        </div>
      )}

      {/* Render blocking overlay */}
      {!isFullyRendered && selectedProvince && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/5 backdrop-blur-sm backdrop-grayscale-75">
          <div className="bg-slate-800/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex justify-center items-center gap-x-2 p-6">
            <LoaderPinwheel className="animate-spin" />
            <span className="text-lg">Rendering map...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const FSAMap = memo(FSAMapMemo);
