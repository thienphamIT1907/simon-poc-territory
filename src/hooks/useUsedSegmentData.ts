import { useMemo } from "react";
import type { Segment } from "../types/segment";

interface UseUsedSegmentDataProps {
  segments: Segment[];
}

interface UseUsedSegmentDataReturn {
  usedLdus: Set<string>;
  usedOperators: Set<string>;
  isLduUsed: (postalCode: string) => boolean;
  isOperatorUsed: (operatorId: string) => boolean;
  getUsedLdusArray: () => string[];
  getUsedOperatorsArray: () => string[];
}

/**
 * Hook to extract and track used LDUs and operators from created segments.
 * Used to disable already-used items in selectors and markers.
 */
export function useUsedSegmentData({
  segments,
}: UseUsedSegmentDataProps): UseUsedSegmentDataReturn {
  const usedLdus = useMemo(() => {
    const ldus = new Set<string>();
    for (const segment of segments) {
      for (const ldu of segment.ldus) {
        ldus.add(ldu);
      }
    }
    return ldus;
  }, [segments]);

  const usedOperators = useMemo(() => {
    const operators = new Set<string>();
    for (const segment of segments) {
      if (segment.operatorId) {
        operators.add(segment.operatorId);
      }
    }
    return operators;
  }, [segments]);

  const isLduUsed = useMemo(
    () => (postalCode: string) => usedLdus.has(postalCode),
    [usedLdus]
  );

  const isOperatorUsed = useMemo(
    () => (operatorId: string) => usedOperators.has(operatorId),
    [usedOperators]
  );

  const getUsedLdusArray = useMemo(
    () => () => Array.from(usedLdus),
    [usedLdus]
  );

  const getUsedOperatorsArray = useMemo(
    () => () => Array.from(usedOperators),
    [usedOperators]
  );

  return {
    usedLdus,
    usedOperators,
    isLduUsed,
    isOperatorUsed,
    getUsedLdusArray,
    getUsedOperatorsArray,
  };
}
