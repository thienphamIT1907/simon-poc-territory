import { APIProvider } from "@vis.gl/react-google-maps";
import type { ConvertedPolygon, ProvinceInfo } from "../../types";
import type { Segment } from "../../types/segment";
import { useVisibleMap } from "../../hooks/useVisibleMap";
import { useSegments } from "../../hooks/useSegments";
import { useUsedSegmentData } from "../../hooks/useUsedSegmentData";
import { memo } from "react";
import { FSAMap } from "../FsaMap";
import { MapFsaSelector } from "../MapFsaSelector";
import { Toaster } from "react-hot-toast";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface MapViewProps {
  polygons: ConvertedPolygon[];
  selectedProvince?: ProvinceInfo | undefined;
  selectedFsaId: string | null;
  onSelectFsa: (fsaId: string | null) => void;
  selectedLdus: string[];
  onSelectLdus: (ldus: string[]) => void;
  onCancelLduSelection: () => void;
  isLoading: boolean;
}

const MapContainerMemo = ({
  polygons,
  selectedProvince,
  selectedFsaId,
  onSelectFsa,
  selectedLdus,
  onSelectLdus,
  onCancelLduSelection,
  isLoading,
}: MapViewProps) => {
  const { containerRef, hasBeenVisible } = useVisibleMap();
  const { createSegments, segments } = useSegments();
  
  // Get used operators from created segments
  const { getUsedOperatorsArray } = useUsedSegmentData({ segments });
  const usedOperators = getUsedOperatorsArray();

  const handleCreateSegment = (segment: Segment) => {
    createSegments(segment);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full bg-slate-800 relative overflow-hidden"
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid #334155",
          },
        }}
      />
      {hasBeenVisible ? (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          {/* FSA Selector overlay */}
          <MapFsaSelector
            selectedProvince={selectedProvince}
            selectedFsaId={selectedFsaId}
            onSelectFsa={onSelectFsa}
            selectedLdus={selectedLdus}
            onSelectLdus={onSelectLdus}
            onCancelLduSelection={onCancelLduSelection}
            onCreateSegment={handleCreateSegment}
            usedOperators={usedOperators}
          />
          <FSAMap
            polygons={selectedProvince ? polygons : []}
            selectedProvince={selectedProvince}
            selectedFsaId={selectedFsaId}
            onSelectFsa={onSelectFsa}
            selectedLdus={selectedLdus}
            onSelectLdus={onSelectLdus}
            isLoading={isLoading}
            segments={segments}
          />
        </APIProvider>
      ) : (
    // ...
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-slate-400 font-bold text-2xl">
              Loading map...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const MapContainer = memo(MapContainerMemo);
