import type { ProvinceInfo } from "./types";

export const CANADA_CENTER = {
  lat: 56.1304,
  lng: -106.3468,
};

export const CANADA_ZOOM = 4;

// Province codes mapped from PRUID in the data
export const PROVINCES: ProvinceInfo[] = [
  {
    code: "11",
    alias: "PEI",
    name: "Prince Edward Island",
    center: { lat: 46.5107, lng: -63.4168 },
    zoom: 12,
    firstCharOfCode: "C",
  },
  {
    code: "12",
    alias: "NS",
    name: "Nova Scotia",
    center: { lat: 44.682, lng: -63.7443 },
    zoom: 7,
    firstCharOfCode: "B",
  },
  {
    code: "13",
    alias: "NB",
    name: "New Brunswick",
    center: { lat: 46.5653, lng: -66.4619 },
    zoom: 7,
    firstCharOfCode: "E",
  },
  {
    code: "10",
    alias: "NL",
    name: "Newfoundland and Labrador",
    center: { lat: 53.1355, lng: -57.6604 },
    zoom: 5,
    firstCharOfCode: "A",
  },
  {
    code: "24",
    alias: "QC",
    name: "Quebec",
    center: { lat: 52.9399, lng: -73.5491 },
    zoom: 5,
    firstCharOfCode: "J",
  },
  {
    code: "35",
    alias: "ON",
    name: "Ontario",
    center: { lat: 51.2538, lng: -85.3232 },
    zoom: 5,
    firstCharOfCode: "O",
  },
];

export const POLYGON_STYLES = {
  default: {
    strokeColor: "#DC2626",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#DC2626",
    fillOpacity: 0.15,
  },
  hover: {
    strokeColor: "#B91C1C",
    strokeOpacity: 1,
    strokeWeight: 2,
    fillColor: "#DC2626",
    fillOpacity: 0.5,
  },
  selected: {
    strokeColor: "#059669", // Emerald-600
    strokeOpacity: 1,
    strokeWeight: 4,
    fillColor: "#10B981", // Emerald-500
    fillOpacity: 0.4,
  },
};
