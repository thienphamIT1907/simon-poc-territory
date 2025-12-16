import { useState, useCallback } from "react";
import { useProvinceData } from "../hooks/useProvinceData";
import type { ProvinceInfo } from "../types";
import { MapContainer } from "../components/containers/MapContainer";
import { LeftSidebar } from "../components/LeftSidebar";

export function MapPage() {
  const [selectedProvince, setSelectedProvince] = useState<
    ProvinceInfo | undefined
  >(undefined);
  const [selectedFsaId, setSelectedFsaId] = useState<string | null>(null);
  const [selectedLdus, setSelectedLdus] = useState<string[]>([]);

  const { polygons, availableProvinces, isLoading, error } = useProvinceData({
    selectedProvince,
  });

  const handleSelectProvince = useCallback(
    (province: ProvinceInfo | undefined) => {
      setSelectedProvince(province);
      // Reset FSA and LDU selection when province changes
      setSelectedFsaId(null);
      setSelectedLdus([]);
    },
    []
  );

  const handleSelectFsa = useCallback((fsaId: string | null) => {
    setSelectedFsaId(fsaId);
    // Reset LDU selection when FSA changes
    setSelectedLdus([]);
  }, []);

  const handleSelectLdus = useCallback((ldus: string[]) => {
    setSelectedLdus(ldus);
  }, []);

  const handleCancelLduSelection = useCallback(() => {
    setSelectedLdus([]);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <LeftSidebar
        selectedProvinceId={selectedProvince?.code}
        onSelectProvince={handleSelectProvince}
        availableProvinces={availableProvinces}
      />
      <MapContainer
        polygons={polygons}
        selectedProvince={selectedProvince}
        selectedFsaId={selectedFsaId}
        onSelectFsa={handleSelectFsa}
        selectedLdus={selectedLdus}
        onSelectLdus={handleSelectLdus}
        onCancelLduSelection={handleCancelLduSelection}
        isLoading={isLoading}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 left-64 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-slate-800/90 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading province data...</span>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute inset-0 left-64 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-red-600/90 text-white px-6 py-3 rounded-xl shadow-lg">
            Error: {error}
          </div>
        </div>
      )}
    </div>
  );
}
