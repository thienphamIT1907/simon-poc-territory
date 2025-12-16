import fs from "node:fs";
import path from "node:path";
import proj4 from "proj4";

// Define EPSG:3347 (Statistics Canada Lambert)
const EPSG_3347 =
  "+proj=lcc +lat_0=63.390675 +lon_0=-91.8666666666667 +lat_1=49 +lat_2=77 +x_0=6200000 +y_0=3000000 +datum=NAD83 +units=m +no_defs";
const WGS84 = "EPSG:4326";

// Register the projection
proj4.defs("EPSG:3347", EPSG_3347);

/**
 * Douglas-Peucker algorithm for line simplification
 * Reduces the number of points while preserving the shape
 */
function simplifyLine(
  points: [number, number][],
  tolerance: number
): [number, number][] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line between first and last
  let maxDistance = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyLine(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyLine(points.slice(maxIndex), tolerance);

    // Combine results, removing duplicate point at junction
    return [...left.slice(0, -1), ...right];
  }

  // Otherwise, return just the endpoints
  return [first, last];
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // lineStart and lineEnd are the same point
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }

  // Calculate the perpendicular distance using the cross product
  const numerator = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(dx ** 2 + dy ** 2);

  return numerator / denominator;
}

/**
 * Convert EPSG:3347 coordinates to WGS84
 */
function convertCoord(x: number, y: number): [number, number] {
  const [lng, lat] = proj4("EPSG:3347", WGS84, [x, y]);
  return [lng, lat]; // GeoJSON uses [lng, lat] order
}

/**
 * Process a polygon ring: convert coordinates and optionally simplify
 */
function processRing(
  ring: number[][],
  tolerance: number
): [number, number][] {
  // First simplify in the source projection (meters, so tolerance is in meters)
  const simplified =
    tolerance > 0
      ? simplifyLine(ring as [number, number][], tolerance)
      : (ring as [number, number][]);

  // Then convert to WGS84
  return simplified.map(([x, y]) => convertCoord(x, y));
}

/**
 * Process a Polygon geometry
 */
function processPolygon(
  coordinates: number[][][],
  tolerance: number
): number[][][] {
  return coordinates.map((ring) => processRing(ring, tolerance));
}

/**
 * Process a MultiPolygon geometry
 */
function processMultiPolygon(
  coordinates: number[][][][],
  tolerance: number
): number[][][][] {
  return coordinates.map((polygon) => processPolygon(polygon, tolerance));
}

/**
 * Process a single GeoJSON feature
 */
function processFeature(
  feature: GeoJSON.Feature,
  tolerance: number
): GeoJSON.Feature {
  const { geometry, properties } = feature;

  if (geometry.type === "Polygon") {
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "Polygon",
        coordinates: processPolygon(
          geometry.coordinates as number[][][],
          tolerance
        ),
      },
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "MultiPolygon",
        coordinates: processMultiPolygon(
          geometry.coordinates as number[][][][],
          tolerance
        ),
      },
    };
  }

  // Return unchanged for unsupported geometry types
  return feature;
}

/**
 * Process an entire GeoJSON FeatureCollection
 */
function processGeoJSON(
  inputPath: string,
  outputPath: string,
  tolerance: number
): void {
  console.log(`\nProcessing: ${path.basename(inputPath)}`);
  console.log(`  Simplification tolerance: ${tolerance}m`);

  // Read input file
  const startRead = performance.now();
  const rawData = fs.readFileSync(inputPath, "utf-8");
  console.log(`  Read time: ${((performance.now() - startRead) / 1000).toFixed(2)}s`);

  // Parse JSON
  const startParse = performance.now();
  const geoJson = JSON.parse(rawData) as GeoJSON.FeatureCollection;
  console.log(`  Parse time: ${((performance.now() - startParse) / 1000).toFixed(2)}s`);

  // Count input coordinates
  let inputCoordCount = 0;
  for (const feature of geoJson.features) {
    inputCoordCount += countCoordinates(feature.geometry);
  }
  console.log(`  Input coordinates: ${inputCoordCount.toLocaleString()}`);

  // Process features
  const startProcess = performance.now();
  const processedFeatures = geoJson.features.map((feature, index) => {
    if (index % 50 === 0) {
      process.stdout.write(`  Processing feature ${index + 1}/${geoJson.features.length}\r`);
    }
    return processFeature(feature, tolerance);
  });
  console.log(`  Process time: ${((performance.now() - startProcess) / 1000).toFixed(2)}s          `);

  // Count output coordinates
  let outputCoordCount = 0;
  for (const feature of processedFeatures) {
    outputCoordCount += countCoordinates(feature.geometry);
  }
  console.log(`  Output coordinates: ${outputCoordCount.toLocaleString()}`);
  console.log(`  Reduction: ${(((inputCoordCount - outputCoordCount) / inputCoordCount) * 100).toFixed(1)}%`);

  // Create output
  const output: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: processedFeatures,
  };

  // Write output file
  const startWrite = performance.now();
  fs.writeFileSync(outputPath, JSON.stringify(output));
  console.log(`  Write time: ${((performance.now() - startWrite) / 1000).toFixed(2)}s`);

  // File size comparison
  const inputSize = fs.statSync(inputPath).size;
  const outputSize = fs.statSync(outputPath).size;
  console.log(`  Input size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Size reduction: ${(((inputSize - outputSize) / inputSize) * 100).toFixed(1)}%`);
}

/**
 * Count total coordinates in a geometry
 */
function countCoordinates(geometry: GeoJSON.Geometry | null): number {
  if (!geometry) return 0;

  if (geometry.type === "Polygon") {
    return geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (sum, polygon) =>
        sum + polygon.reduce((pSum, ring) => pSum + ring.length, 0),
      0
    );
  }

  return 0;
}

// Main execution
// Simplification tolerance in meters (Douglas-Peucker algorithm)
// Lower = more detail, larger file | Higher = less detail, smaller file
// Recommended values:
//   50m  = High detail (current) - Good for zoomed-in views
//   100m = Medium detail - Good balance for most use cases
//   200m = Low detail - Faster rendering, smaller files
// Note: Visual difference is minimal at typical map zoom levels (3-10)
const TOLERANCE_METERS = 50;

const inputDir = path.resolve("src/mock/merged");
const outputDir = path.resolve("public/geojson");

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process all GeoJSON files
const files = fs.readdirSync(inputDir).filter((f: string) => f.endsWith(".geojson"));

console.log("=== GeoJSON Preprocessing Script ===");
console.log(`Input directory: ${inputDir}`);
console.log(`Output directory: ${outputDir}`);
console.log(`Found ${files.length} files to process`);

const totalStart = performance.now();

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file.replace(".geojson", ".json"));
  processGeoJSON(inputPath, outputPath, TOLERANCE_METERS);
}

console.log(`\n=== Complete ===`);
console.log(`Total time: ${((performance.now() - totalStart) / 1000).toFixed(2)}s`);

// Generate metadata file
console.log(`\n=== Generating Metadata ===`);
const metadataPath = path.join(outputDir, "metadata.json");
const metadata: Record<string, { fsaCount: number; fileSize: string; fileSizeBytes: number }> = {};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

const outputFiles = fs.readdirSync(outputDir).filter((f: string) => f.endsWith(".json") && f !== "metadata.json");

for (const file of outputFiles) {
  const filePath = path.join(outputDir, file);
  const fileStats = fs.statSync(filePath);
  const fileSize = formatFileSize(fileStats.size);
  
  // Read the file to count features
  const rawData = fs.readFileSync(filePath, "utf-8");
  const geoJson = JSON.parse(rawData);
  const fsaCount = geoJson.features?.length || 0;
  
  // Extract province key from filename (e.g., "O-ON.json" -> "O-ON")
  const provinceKey = file.replace(".json", "");
  
  metadata[provinceKey] = { fsaCount, fileSize, fileSizeBytes: fileStats.size };
  console.log(`  ${provinceKey}: ${fsaCount} FSAs, ${fileSize}`);
}

fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
console.log(`\nMetadata written to: ${metadataPath}`);
