import proj4 from 'proj4';
import type { ConvertedPolygon, FSAFeature } from '../types';

// Define EPSG:3347 (Statistics Canada Lambert)
// get from https://epsg.io/3347.js
const EPSG_3347 = '+proj=lcc +lat_0=63.390675 +lon_0=-91.8666666666667 +lat_1=49 +lat_2=77 +x_0=6200000 +y_0=3000000 +datum=NAD83 +units=m +no_defs';

// WGS84 (standard lat/lng)
const WGS84 = 'EPSG:4326';

// Register the projection
proj4.defs('EPSG:3347', EPSG_3347);

/**
 * Convert EPSG:3347 coordinates to WGS84 (lat/lng)
 */
export function convertCoordinate(x: number, y: number): google.maps.LatLngLiteral {
  const [lng, lat] = proj4('EPSG:3347', WGS84, [x, y]);
  return { lat, lng };
}

/**
 * Convert polygon coordinates from EPSG:3347 to WGS84
 */
export function convertPolygonCoordinates(
  coordinates: number[][][]
): google.maps.LatLngLiteral[][] {
  return coordinates.map((ring) =>
    ring.map(([x, y]) => convertCoordinate(x, y))
  );
}

/**
 * Convert a GeoJSON feature to a ConvertedPolygon
 * Does NOT split MultiPolygons to reduce object count
 */
export function convertFeatureToPolygon(feature: FSAFeature): ConvertedPolygon {
  const { properties, geometry } = feature;

  if (geometry.type === 'MultiPolygon') {
    // MultiPolygon: keep all polygon parts together
    const coordinates = (geometry.coordinates as number[][][][]).map((polygon) =>
      polygon.map((ring) =>
        ring.map(([x, y]) => convertCoordinate(x, y))
      )
    );
    
    // Calculate center from the first (usually largest) polygon part
    const firstPolygonRings = coordinates[0];
    
    return {
      id: properties.gml_id,
      fsaId: properties.CFSAUID,
      provinceId: properties.PRUID,
      provinceName: properties.PRNAME,
      coordinates,
      center: calculatePolygonCenter(firstPolygonRings),
      isMultiPolygon: true,
    };
  }
  
  // Polygon: single polygon
  const coordinates = (geometry.coordinates as number[][][]).map((ring) =>
    ring.map(([x, y]) => convertCoordinate(x, y))
  );
  
  return {
    id: properties.gml_id,
    fsaId: properties.CFSAUID,
    provinceId: properties.PRUID,
    provinceName: properties.PRNAME,
    coordinates,
    center: calculatePolygonCenter(coordinates),
    isMultiPolygon: false,
  };
}

/**
 * Convert all features in a collection
 */
export function convertAllFeatures(features: FSAFeature[]): ConvertedPolygon[] {
  return features.map((feature) => convertFeatureToPolygon(feature));
}

/**
 * Convert preprocessed features (already in WGS84 format)
 * Skips proj4 conversion since coordinates are already in lat/lng
 * 
 * IMPORTANT: Does NOT split MultiPolygons to reduce polygon count
 * (e.g., Ontario has 520 FSAs that would become 38K+ polygons if split)
 */
export function convertPreprocessedFeatures(features: FSAFeature[]): ConvertedPolygon[] {
  const result: ConvertedPolygon[] = [];

  for (const feature of features) {
    const { properties, geometry } = feature;

    if (geometry.type === 'MultiPolygon') {
      const polygonCoords = geometry.coordinates as number[][][][];
      
      // Convert all polygon parts: [lng, lat] to {lat, lng}
      const coordinates = polygonCoords.map((polygon) =>
        polygon.map((ring) =>
          ring.map(([lng, lat]) => ({ lat, lng }))
        )
      );
      
      // Calculate center from the first (usually largest) polygon part
      const firstPolygonRings = coordinates[0];
      
      result.push({
        id: properties.gml_id,
        fsaId: properties.CFSAUID,
        provinceId: properties.PRUID,
        provinceName: properties.PRNAME,
        coordinates,
        center: calculatePolygonCenter(firstPolygonRings),
        isMultiPolygon: true,
      });
    } else if (geometry.type === 'Polygon') {
      const polygonCoords = geometry.coordinates as number[][][];
      // Convert [lng, lat] to {lat, lng}
      const coordinates = polygonCoords.map((ring) =>
        ring.map(([lng, lat]) => ({ lat, lng }))
      );
      result.push({
        id: properties.gml_id,
        fsaId: properties.CFSAUID,
        provinceId: properties.PRUID,
        provinceName: properties.PRNAME,
        coordinates,
        center: calculatePolygonCenter(coordinates),
        isMultiPolygon: false,
      });
    }
  }

  return result;
}

/**
 * Calculate the centroid of a single ring (closed polygon)
 * Uses the formula for centroid of a polygon based on signed area
 */
function calculateRingCentroid(ring: google.maps.LatLngLiteral[]): {
  centroid: google.maps.LatLngLiteral;
  area: number;
} {
  let signedArea = 0;
  let centroidLat = 0;
  let centroidLng = 0;

  const n = ring.length;
  if (n < 3) {
    // Fallback for degenerate cases
    const avgLat = ring.reduce((sum, p) => sum + p.lat, 0) / n;
    const avgLng = ring.reduce((sum, p) => sum + p.lng, 0) / n;
    return { centroid: { lat: avgLat, lng: avgLng }, area: 0 };
  }

  for (let i = 0; i < n; i++) {
    const current = ring[i];
    const next = ring[(i + 1) % n];

    // Cross product for signed area
    const cross = current.lng * next.lat - next.lng * current.lat;
    signedArea += cross;

    centroidLat += (current.lat + next.lat) * cross;
    centroidLng += (current.lng + next.lng) * cross;
  }

  signedArea *= 0.5;
  const area = Math.abs(signedArea);

  if (area < 1e-10) {
    // Fallback for very small or degenerate polygons
    const avgLat = ring.reduce((sum, p) => sum + p.lat, 0) / n;
    const avgLng = ring.reduce((sum, p) => sum + p.lng, 0) / n;
    return { centroid: { lat: avgLat, lng: avgLng }, area: 0 };
  }

  const factor = 1 / (6 * signedArea);
  return {
    centroid: {
      lat: centroidLat * factor,
      lng: centroidLng * factor,
    },
    area,
  };
}

/**
 * Calculate the center of a polygon (handles multiple rings)
 * Uses area-weighted centroid for the outer ring (first ring, largest area)
 */
export function calculatePolygonCenter(
  coordinates: google.maps.LatLngLiteral[][]
): google.maps.LatLngLiteral {
  if (coordinates.length === 0) {
    return { lat: 0, lng: 0 };
  }

  // For polygons with holes, use only the outer ring (first one)
  // or find the ring with the largest area
  let bestCentroid: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  let maxArea = -1;

  for (const ring of coordinates) {
    const { centroid, area } = calculateRingCentroid(ring);
    if (area > maxArea) {
      maxArea = area;
      bestCentroid = centroid;
    }
  }

  return bestCentroid;
}

/**
 * Calculate bounds for a set of polygons
 */
export function calculateBounds(
  polygons: ConvertedPolygon[]
): google.maps.LatLngBoundsLiteral | null {
  if (polygons.length === 0) return null;

  const allPoints: google.maps.LatLngLiteral[] = [];
  
  for (const polygon of polygons) {
    if (polygon.isMultiPolygon) {
      // MultiPolygon: coordinates is LatLngLiteral[][][]
      const multiCoords = polygon.coordinates as google.maps.LatLngLiteral[][][];
      for (const polygonPart of multiCoords) {
        for (const ring of polygonPart) {
          allPoints.push(...ring);
        }
      }
    } else {
      // Polygon: coordinates is LatLngLiteral[][]
      const polyCoords = polygon.coordinates as google.maps.LatLngLiteral[][];
      for (const ring of polyCoords) {
        allPoints.push(...ring);
      }
    }
  }

  if (allPoints.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const point of allPoints) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }

  return { north, south, east, west };
}
