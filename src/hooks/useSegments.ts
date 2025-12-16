import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import type { Segment } from "../types/segment";
import { loadSegments, saveSegments } from "../types/segment";

export function useSegments() {
  const [segments, setSegments] = useState<Segment[]>([]);

  // Load segments from localStorage on mount
  useEffect(() => {
    const savedSegments = loadSegments();
    setSegments(savedSegments);
  }, []);

  // Create one or multiple segments
  const createSegments = useCallback((newSegments: Segment | Segment[]) => {
    const toAdd = Array.isArray(newSegments) ? newSegments : [newSegments];
    
    setSegments((prev) => {
      const updated = [...prev, ...toAdd];
      saveSegments(updated);
      return updated;
    });
    
    toast.success(`${toAdd.length} segment(s) created successfully!`);
  }, []);

  // Delete a segment by ID
  const deleteSegment = useCallback((id: string) => {
    setSegments((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSegments(updated);
      return updated;
    });
    toast.success("Segment deleted successfully!");
  }, []);

  return {
    segments,
    createSegments,
    deleteSegment,
  };
}
