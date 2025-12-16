import { useEffect, useMemo, useRef, useState } from "react";
import type { ConvertedPolygon, FSAFeature, ProvinceInfo } from "../types";
import { convertAllFeatures, convertPreprocessedFeatures } from "../utils/coordinate-converter";

interface UseProvinceDataResult {
  polygons: ConvertedPolygon[];
  availableProvinces: string[];
  isLoading: boolean;
  error: string | null;
}

type Props = {
  selectedProvince?: ProvinceInfo;
};

// Cache for storing fetched data by province code to prevent duplicate fetches
type CacheEntry = {
  features: FSAFeature[];
  polygons: ConvertedPolygon[];
};
const provinceCache = new Map<string, CacheEntry>();

export const useProvinceData = ({
  selectedProvince,
}: Props): UseProvinceDataResult => {
  // Keep previous polygons visible while loading new ones
  const [polygons, setPolygons] = useState<ConvertedPolygon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current request to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Skip fetch if no province selected - but DON'T clear existing polygons
    if (!selectedProvince?.firstCharOfCode || !selectedProvince?.alias) {
      return;
    }

    const cacheKey = selectedProvince.code;

    // Check cache first - use cached data immediately if available (no flash)
    const cached = provinceCache.get(cacheKey);
    if (cached) {
      setPolygons(cached.polygons);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Abort previous request if still pending
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      // Set loading but DON'T clear polygons - keep showing previous data
      setIsLoading(true);
      setError(null);

      try {
        // Try preprocessed files first (public/geojson/), fall back to original
        const preprocessedPath = `/geojson/${selectedProvince.firstCharOfCode}-${selectedProvince.alias}.json`;
        const originalPath = `/src/mock/merged/${selectedProvince.firstCharOfCode}-${selectedProvince.alias}.geojson`;
        
        let response = await fetch(preprocessedPath, {
          signal: abortController.signal,
        });
        
        // If preprocessed file doesn't exist, fall back to original
        const usePreprocessed = response.ok;
        if (!usePreprocessed) {
          response = await fetch(originalPath, {
            signal: abortController.signal,
          });
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        const features = data.features as FSAFeature[];

        // Pre-compute polygons and cache both
        // If using preprocessed files, coordinates are already in WGS84
        const convertedPolygons = usePreprocessed 
          ? convertPreprocessedFeatures(features)
          : convertAllFeatures(features);
        provinceCache.set(cacheKey, { features, polygons: convertedPolygons });

        // Only update state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setPolygons(convertedPolygons);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        // DON'T clear polygons on error - keep showing previous data
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup: abort request on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [
    selectedProvince?.code,
    selectedProvince?.firstCharOfCode,
    selectedProvince?.alias,
  ]);

  const availableProvinces = useMemo(() => {
    const provinceIds = new Set(polygons.map((p) => p.provinceId));
    return [...provinceIds];
  }, [polygons]);

  return {
    polygons,
    availableProvinces,
    isLoading,
    error,
  };
};
