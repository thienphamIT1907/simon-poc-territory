// Segment types for FSA Segment Management

export interface Segment {
  id: string;
  name: string;
  provinceCode: string;
  fsaId: string;
  ldus: string[]; // Array of postalCode
  operatorId: string;
  // Visual properties
  geometry?: {
    type: "Polygon" | "Circle";
    coordinates?: google.maps.LatLngLiteral[]; // For Polygon
    center?: google.maps.LatLngLiteral; // For Circle
    radius?: number; // In meters, for Circle
  };
  groupedLdus?: {
    location: { lat: number; lng: number };
    postalCodes: string[];
  }[];
}

export interface Operator {
  id: string;
  name: string;
  color?: string; // Optional color for visualization
}

// Form state for creating segments
export interface SegmentFormItem {
  id: string;
  name: string;
  ldus: string[];
  operatorId: string;
}

// LocalStorage key
export const SEGMENTS_STORAGE_KEY = "fsa-segments";

// Helper functions for localStorage
export function loadSegments(): Segment[] {
  try {
    const stored = localStorage.getItem(SEGMENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSegments(segments: Segment[]): void {
  localStorage.setItem(SEGMENTS_STORAGE_KEY, JSON.stringify(segments));
}
