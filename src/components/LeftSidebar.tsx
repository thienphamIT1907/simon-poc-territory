import { memo, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { PROVINCES } from "../constants";
import type { ProvinceInfo } from "../types";
import { Database, MapPin, FileJson, TriangleAlert, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  selectedProvinceId: string | undefined;
  onSelectProvince: (province: ProvinceInfo | undefined) => void;
  availableProvinces: string[];
}

interface ProvinceMetadata {
  fsaCount: number;
  lduCount: number;
  rawFileSize: string;
  rawFileSizeBytes: number;
  fileSize: string;
  fileSizeBytes: number;
}

type MetadataMap = Record<string, ProvinceMetadata>;

const LeftSidebarMemo = ({
  selectedProvinceId,
  onSelectProvince,
  availableProvinces,
}: SidebarProps) => {
  const [metadata, setMetadata] = useState<MetadataMap>({});
  const [loadingProvinceId, setLoadingProvinceId] = useState<string | null>(
    null
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Threshold for large files that show loading indicator (6MB)
  const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024; // 6MB in bytes

  // Fetch province metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch("/geojson/metadata.json");
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (err) {
        console.warn("Failed to load province metadata:", err);
      }
    };

    fetchMetadata();
  }, []);

  return (
    <aside
      className={twMerge(
        "h-full bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden relative",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={twMerge(
          "absolute top-1/2 -translate-y-1/2 z-100",
          "w-6 h-12 bg-slate-700 hover:bg-slate-600 border border-slate-600",
          "flex items-center justify-center text-white",
          "transition-all duration-300 ease-in-out",
          "rounded-r-lg shadow-lg",
          isCollapsed ? "right-6" : "-right-1"
        )}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Collapsed View - Compact Province List */}
      {isCollapsed && (
        <nav className="flex-1 overflow-y-auto py-2 px-1">
          <ul className="space-y-1">
            {PROVINCES.map((province) => {
              const isSelected = selectedProvinceId === province.code;
              return (
                <li key={province.code}>
                  <button
                    type="button"
                    onClick={() => onSelectProvince(province)}
                    className={twMerge(
                      "w-full p-2 rounded-lg text-center transition-all duration-200",
                      "text-xs font-bold cursor-pointer",
                      isSelected
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/50"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    )}
                    title={province.name}
                  >
                    {province.alias}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Expanded View - Full Content */}
      <div
        className={twMerge(
          "flex flex-col h-full overflow-hidden",
          "transition-opacity duration-200 ease-in-out",
          isCollapsed ? "hidden" : "opacity-100"
        )}
      >
        {/* Header */}
        <header className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h1 className="text-xl font-bold text-white">
            Territory Map - SIMON - POC
          </h1>
          <div className="flex justify-between items-center w-full gap-x-2 mt-2">
            <TriangleAlert className="text-amber-400 inline-block size-8" />
            <p className="text-xs text-slate-400 mt-1">
              Note: This is sample data that may be outdated or inaccurate
            </p>
          </div>
        </header>

        {/* Province List */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Show All Button */}
          <button
            type="button"
            onClick={() => onSelectProvince(undefined)}
            className={twMerge(
              "w-full px-4 py-3 rounded-lg text-left transition-all duration-200",
              "flex items-center gap-3 group",
              selectedProvinceId === null
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span className="font-medium">All Provinces</span>
          </button>

          {/* Divider */}
          <div className="my-2 border-t border-slate-700" />

          {/* Province List */}
          <ul className="space-y-1">
            {PROVINCES.map((province) => {
              const isSelected = selectedProvinceId === province.code;
              const hasData = availableProvinces.includes(province.code);
              const metadataKey = `${province.firstCharOfCode}-${province.alias}`;
              const provinceMetadata = metadata[metadataKey];

              return (
                <li key={province.code}>
                  <button
                    type="button"
                    onClick={() => {
                      // Set loading state for large files
                      const isLargeFile =
                        provinceMetadata?.fileSizeBytes &&
                        provinceMetadata.fileSizeBytes > LARGE_FILE_THRESHOLD;
                      if (isLargeFile) {
                        setLoadingProvinceId(province.code);
                        // Clear loading state after a delay to show the indicator
                        setTimeout(() => setLoadingProvinceId(null), 2000);
                      }
                      onSelectProvince(province);
                    }}
                    className={twMerge(
                      "w-full px-4 py-3 rounded-lg text-left transition-all duration-200",
                      "flex flex-col gap-1 group cursor-pointer",
                      isSelected
                        ? "bg-red-600 text-white shadow-xl shadow-red-600/50"
                        : hasData
                        ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                        : "text-slate-500 hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-base">
                        {province.name} ({province.alias})
                      </span>
                      {/* Loading indicator for large files */}
                      {loadingProvinceId === province.code && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Metadata Info */}
                    {provinceMetadata && (
                      <div
                        className={twMerge(
                          "flex flex-col gap-1 text-xs",
                          isSelected ? "text-white/80" : "text-slate-400"
                        )}
                      >
                        {/* FSA and LDU counts */}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            {provinceMetadata.fsaCount} FSAs
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {provinceMetadata.lduCount.toLocaleString()} LDUs
                          </span>
                        </div>
                        {/* File sizes */}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <FileJson size={12} />
                            Raw: {provinceMetadata.rawFileSize}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database size={12} />
                            Compressed: {provinceMetadata.fileSize}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export const LeftSidebar = memo(LeftSidebarMemo);
