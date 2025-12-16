import { useState, useEffect, useMemo, useRef } from "react";
import { PROVINCES } from "../constants";
import type { ProvinceInfo } from "../types";

export interface FsaOption {
  value: string;
  label: string;
}

interface UseFsaOptionsResult {
  options: FsaOption[];
  isLoading: boolean;
  error: string | null;
}

// Cache for FSA options to prevent duplicate fetches
const fsaOptionsCache = new Map<string, FsaOption[]>();

/**
 * Hook to load FSA options based on province selection
 * Supports both province code (string) and ProvinceInfo object
 */
export function useFsaOptions(
  province: string | ProvinceInfo | undefined
): UseFsaOptionsResult {
  const [options, setOptions] = useState<FsaOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track current request to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resolve province info from code or object
  const provinceInfo = useMemo<ProvinceInfo | undefined>(() => {
    if (!province) return undefined;
    if (typeof province === "string") {
      return PROVINCES.find((p) => p.code === province);
    }
    return province;
  }, [province]);

  useEffect(() => {
    if (!provinceInfo) {
      setOptions([]);
      setError(null);
      return;
    }

    const cacheKey = `${provinceInfo.firstCharOfCode}-${provinceInfo.alias}`;

    // Check cache first
    const cached = fsaOptionsCache.get(cacheKey);
    if (cached) {
      setOptions(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Abort previous request if still pending
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const loadFsaData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/geojson/${provinceInfo.firstCharOfCode}-${provinceInfo.alias}.json`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch FSA data: ${response.status}`);
        }

        const data = await response.json();
        const fsaSet = new Set<string>();
        
        for (const feature of data.features) {
          if (feature.properties?.CFSAUID) {
            fsaSet.add(feature.properties.CFSAUID);
          }
        }

        const fsaOptions: FsaOption[] = Array.from(fsaSet)
          .sort()
          .map((fsaId) => ({
            value: fsaId,
            label: fsaId,
          }));

        // Cache the options
        fsaOptionsCache.set(cacheKey, fsaOptions);

        // Only update state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setOptions(fsaOptions);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Failed to load FSA data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setOptions([]);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadFsaData();

    // Cleanup: abort request on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [provinceInfo]);

  return { options, isLoading, error };
}
