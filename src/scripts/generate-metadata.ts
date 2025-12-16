import fs from "node:fs";
import path from "node:path";

/**
 * Generate metadata file for all processed GeoJSON files
 * Extracts FSA count, LDU count, file sizes for each province
 */

const preprocessedDir = path.resolve("public/geojson");
const rawDir = path.resolve("src/mock/merged");
const lduDir = path.resolve("src/mock/ldu");
const outputFile = path.join(preprocessedDir, "metadata.json");

interface ProvinceMetadata {
  fsaCount: number;
  lduCount: number;
  rawFileSize: string;
  rawFileSizeBytes: number;
  fileSize: string;
  fileSizeBytes: number;
}

type MetadataMap = Record<string, ProvinceMetadata>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Check if directories exist
if (!fs.existsSync(preprocessedDir)) {
  console.error(`Directory not found: ${preprocessedDir}`);
  process.exit(1);
}

// Get preprocessed files (.json in public/geojson)
const preprocessedFiles = fs.readdirSync(preprocessedDir).filter((f) => f.endsWith(".json") && f !== "metadata.json");

if (preprocessedFiles.length === 0) {
  console.warn("No JSON files found in", preprocessedDir);
  process.exit(0);
}

console.log("=== Generating Province Metadata ===");
console.log(`Found ${preprocessedFiles.length} preprocessed files`);

const metadata: MetadataMap = {};

for (const file of preprocessedFiles) {
  const preprocessedPath = path.join(preprocessedDir, file);
  const preprocessedStats = fs.statSync(preprocessedPath);
  const fileSize = formatFileSize(preprocessedStats.size);
  
  // Read the preprocessed file to count features
  const rawData = fs.readFileSync(preprocessedPath, "utf-8");
  const geoJson = JSON.parse(rawData);
  const fsaCount = geoJson.features?.length || 0;
  
  // Extract province key from filename (e.g., "O-ON.json" -> "O-ON")
  const provinceKey = file.replace(".json", "");
  
  // Get raw file size (from src/mock/merged)
  const rawFilePath = path.join(rawDir, `${provinceKey}.geojson`);
  let rawFileSize = "N/A";
  let rawFileSizeBytes = 0;
  if (fs.existsSync(rawFilePath)) {
    const rawStats = fs.statSync(rawFilePath);
    rawFileSize = formatFileSize(rawStats.size);
    rawFileSizeBytes = rawStats.size;
  }
  
  // Get LDU count (from src/mock/ldu)
  const lduFilePath = path.join(lduDir, `${provinceKey}-ldu.geojson`);
  let lduCount = 0;
  if (fs.existsSync(lduFilePath)) {
    const lduData = fs.readFileSync(lduFilePath, "utf-8");
    const lduGeoJson = JSON.parse(lduData);
    lduCount = lduGeoJson.features?.length || 0;
  }
  
  metadata[provinceKey] = {
    fsaCount,
    lduCount,
    rawFileSize,
    rawFileSizeBytes,
    fileSize,
    fileSizeBytes: preprocessedStats.size,
  };
  
  console.log(`  ${provinceKey}: ${fsaCount} FSAs, ${lduCount} LDUs, Raw: ${rawFileSize}, Preprocessed: ${fileSize}`);
}

// Write metadata file
fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
console.log(`\nMetadata written to: ${outputFile}`);
