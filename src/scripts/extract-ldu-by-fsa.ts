/**
 * FSA (Forward Sortation Area): First 3 characters of Canadian postal code (e.g., "M5V")
 * LDU (Local Delivery Unit): Last 3 characters of Canadian postal code (e.g., "1K2")
 * Full postal code = FSA + LDU (e.g., "M5V1K2")
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface PostalCodeEntry {
  city: string;
  'province-code': string;
  'country-code': string;
  'postal-code': string;
  latitude: number;
  longitude: number;
}

interface FSAFeature {
  type: 'Feature';
  properties: {
    CFSAUID: string;
    [key: string]: unknown;
  };
  geometry: unknown;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: FSAFeature[];
}

interface LDUFeature {
  type: 'Feature';
  properties: {
    postalCode: string;
    fsa: string;
    ldu: string;
    city: string;
    provinceCode: string;
    countryCode: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface LDUFeatureCollection {
  type: 'FeatureCollection';
  features: LDUFeature[];
}

// Paths
const POSTAL_CODES_PATH = path.resolve(__dirname, '../mock/postal-codes-canada.json');
const MERGED_DIR = path.resolve(__dirname, '../mock/merged');
const OUTPUT_DIR = path.resolve(__dirname, '../mock/ldu');

/**
 * Extract all unique FSA codes from a merged GeoJSON file
 */
function extractFSACodes(geojsonPath: string): Set<string> {
  console.log(`📂 Reading FSA codes from: ${path.basename(geojsonPath)}`);
  const content = fs.readFileSync(geojsonPath, 'utf-8');
  const geojson: FeatureCollection = JSON.parse(content);

  const fsaCodes = new Set<string>();
  for (const feature of geojson.features) {
    if (feature.properties?.CFSAUID) {
      fsaCodes.add(feature.properties.CFSAUID);
    }
  }

  console.log(`   Found ${fsaCodes.size} unique FSA codes`);
  return fsaCodes;
}

/**
 * Load all postal code entries from postal-codes-canada.json
 */
function loadPostalCodes(): PostalCodeEntry[] {
  console.log('\n📦 Loading postal codes from postal-codes-canada.json...');
  const content = fs.readFileSync(POSTAL_CODES_PATH, 'utf-8');
  const postalCodes: PostalCodeEntry[] = JSON.parse(content);
  console.log(`   Loaded ${postalCodes.length} postal code entries\n`);
  return postalCodes;
}

/**
 * Create LDU GeoJSON features from postal codes matching FSA codes
 */
function createLDUFeatures(
  postalCodes: PostalCodeEntry[],
  fsaCodes: Set<string>
): LDUFeature[] {
  const features: LDUFeature[] = [];

  for (const entry of postalCodes) {
    const postalCode = entry['postal-code'];
    
    // Skip entries with invalid or missing postal codes
    if (!postalCode || typeof postalCode !== 'string' || postalCode.length < 6) {
      continue;
    }
    
    const fsa = postalCode.substring(0, 3).toUpperCase();

    if (fsaCodes.has(fsa)) {
      const ldu = postalCode.substring(3, 6);

      features.push({
        type: 'Feature',
        properties: {
          postalCode: postalCode,
          fsa: fsa,
          ldu: ldu,
          city: entry.city,
          provinceCode: entry['province-code'],
          countryCode: entry['country-code'],
        },
        geometry: {
          type: 'Point',
          coordinates: [entry.longitude, entry.latitude],
        },
      });
    }
  }

  return features;
}

/**
 * Process a single merged GeoJSON file and output LDU GeoJSON
 */
function processMergedFile(
  mergedFilePath: string,
  postalCodes: PostalCodeEntry[],
  outputDir: string
): void {
  const baseName = path.basename(mergedFilePath, '.geojson');

  // Extract FSA codes from the merged file
  const fsaCodes = extractFSACodes(mergedFilePath);

  // Create LDU features
  const lduFeatures = createLDUFeatures(postalCodes, fsaCodes);

  console.log(`   Generated ${lduFeatures.length} LDU features`);

  // Create output GeoJSON
  const outputGeojson: LDUFeatureCollection = {
    type: 'FeatureCollection',
    features: lduFeatures,
  };

  // Write output file
  const outputPath = path.join(outputDir, `${baseName}-ldu.geojson`);
  fs.writeFileSync(outputPath, JSON.stringify(outputGeojson, null, 2));
  console.log(`   ✅ Saved to: ${path.basename(outputPath)}\n`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 LDU Extraction Script');
  console.log('========================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);
  }

  // Load postal codes once
  const postalCodes = loadPostalCodes();

  // Get all merged GeoJSON files
  const mergedFiles = fs
    .readdirSync(MERGED_DIR)
    .filter((file) => file.endsWith('.geojson'))
    .map((file) => path.join(MERGED_DIR, file));

  console.log(`📋 Found ${mergedFiles.length} merged GeoJSON files to process\n`);

  // Process each merged file
  for (const mergedFile of mergedFiles) {
    processMergedFile(mergedFile, postalCodes, OUTPUT_DIR);
  }

  console.log('🎉 All files processed successfully!');

  // Summary
  console.log('\n📊 Summary:');
  const outputFiles = fs
    .readdirSync(OUTPUT_DIR)
    .filter((file) => file.endsWith('.geojson'));
  for (const file of outputFiles) {
    const filePath = path.join(OUTPUT_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   ${file}: ${sizeKB} KB`);
  }
}

main().catch(console.error);
