import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export interface ProvinceInfo {
  code: string;
  name: string;
  alias: string;
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  firstCharOfCode: "B" | "C" | "E" | "J" | "O" | "A";
}

export interface FSAProperties {
  gml_id: string;
  CFSAUID: string;
  DGUID: string;
  PRUID: string;
  PRNAME: string;
  LANDAREA: number;
}

export type FSAFeature = {
  type: "Feature";
  properties: FSAProperties;
  geometry: {
    type: "MultiPolygon" | "Polygon";
    coordinates: number[][][] | number[][][][];
  };
};

export type FSAFeatureCollection = FeatureCollection<
  MultiPolygon | Polygon,
  FSAProperties
>;

export interface ConvertedPolygon {
  id: string;
  fsaId: string; // CFSAUID - Forward Sortation Area code (e.g., "C0A", "C1A")
  provinceId: string;
  provinceName: string;
  // For Polygon: single array of rings
  // For MultiPolygon: array of polygon coordinates (each polygon is an array of rings)
  coordinates: google.maps.LatLngLiteral[][]  | google.maps.LatLngLiteral[][][];
  center: google.maps.LatLngLiteral;
  isMultiPolygon?: boolean; // Flag to indicate if this is a MultiPolygon
}

// LDU (Local Delivery Unit) types
export interface LduProperties {
  postalCode: string;
  fsa: string;
  ldu: string;
  city: string;
  provinceCode: string;
  countryCode: string;
}

export interface LduFeature {
  type: "Feature";
  properties: LduProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface LduFeatureCollection {
  type: "FeatureCollection";
  features: LduFeature[];
}

export interface LduMarkerData {
  postalCode: string;
  fsa: string;
  ldu: string;
  city: string;
  position: google.maps.LatLngLiteral;
}
