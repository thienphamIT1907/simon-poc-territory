import { useEffect, useMemo, useRef, useState } from "react";
import type { LduFeature, LduMarkerData, ProvinceInfo } from "../types";

interface UseLduDataResult {
  lduMarkers: LduMarkerData[];
  isLoading: boolean;
  error: string | null;
}

interface UseLduDataProps {
  selectedProvince?: ProvinceInfo;
  selectedFsaId: string | null;
}

// Cache for storing fetched LDU data by province to prevent duplicate fetches
const lduCache = new Map<string, LduFeature[]>();

/**
 * Hook to load and filter LDU (Local Delivery Unit) data
 * - Fetches LDU GeoJSON by province when a province is selected
 * - Filters LDUs by the selected FSA
 * - Caches data to prevent duplicate network requests
 */
export const useLduData = ({
  selectedProvince,
  selectedFsaId,
}: UseLduDataProps): UseLduDataResult => {
  const [allLdus, setAllLdus] = useState<LduFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current request to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch LDU data when province changes
  useEffect(() => {
    // Skip if no province selected
    if (!selectedProvince?.firstCharOfCode || !selectedProvince?.alias) {
      setAllLdus([]);
      return;
    }

    const cacheKey = `${selectedProvince.firstCharOfCode}-${selectedProvince.alias}`;

    // Check cache first
    const cached = lduCache.get(cacheKey);
    if (cached) {
      setAllLdus(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Abort previous request if still pending
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // LDU files are named like: A-NL-ldu.geojson, B-NS-ldu.geojson, etc.
        // Files are served from public/ldu/ in production builds
        const lduPath = `/ldu/${selectedProvince.firstCharOfCode}-${selectedProvince.alias}-ldu.geojson`;

        const response = await fetch(lduPath, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch LDU data: ${response.status}`);
        }

        const data = await response.json();
        const features = data.features as LduFeature[];

        // Cache the data
        lduCache.set(cacheKey, features);

        // Only update state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setAllLdus(features);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.warn("LDU data not available:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setAllLdus([]);
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
  }, [selectedProvince?.firstCharOfCode, selectedProvince?.alias]);

  // Filter LDUs by selected FSA and convert to marker data
  // Also deduplicate by postal code since the same postal code can appear
  // multiple times in the data with different coordinates
  const lduMarkers = useMemo<LduMarkerData[]>(() => {
    // Return empty if no FSA selected
    if (!selectedFsaId) return [];

    // Filter LDUs matching the selected FSA
    const filtered = allLdus.filter(
      (ldu) => ldu.properties.fsa === selectedFsaId
    );

    // Deduplicate by postal code - keep first occurrence only
    const seenPostalCodes = new Set<string>();
    const uniqueLdus = filtered.filter((ldu) => {
      if (seenPostalCodes.has(ldu.properties.postalCode)) {
        return false;
      }
      seenPostalCodes.add(ldu.properties.postalCode);
      return true;
    });

    // Convert to marker data
    return uniqueLdus.map((ldu) => ({
      postalCode: ldu.properties.postalCode,
      fsa: ldu.properties.fsa,
      ldu: ldu.properties.ldu,
      city: ldu.properties.city,
      position: {
        lng: ldu.geometry.coordinates[0],
        lat: ldu.geometry.coordinates[1],
      },
    }));
  }, [allLdus, selectedFsaId]);

  return {
    lduMarkers,
    isLoading,
    error,
  };
};
