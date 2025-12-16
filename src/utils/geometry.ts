/**
 * Calculates the Convex Hull of a set of points using the Monotone Chain algorithm.
 * @param points Array of LatLngLiteral points
 * @returns Array of LatLngLiteral points representing the convex hull polygon
 */
export function calculateConvexHull(
  points: google.maps.LatLngLiteral[]
): google.maps.LatLngLiteral[] {
  if (points.length < 3) return points;

  // Sort points first by lat, then by lng
  const sortedPoints = [...points].sort((a, b) => {
    return a.lat === b.lat ? a.lng - b.lng : a.lat - b.lat;
  });

  const crossProduct = (
    o: google.maps.LatLngLiteral,
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral
  ) => {
    return (a.lat - o.lat) * (b.lng - o.lng) - (a.lng - o.lng) * (b.lat - o.lat);
  };

  // Build lower hull
  const lower: google.maps.LatLngLiteral[] = [];
  for (const p of sortedPoints) {
    while (
      lower.length >= 2 &&
      crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: google.maps.LatLngLiteral[] = [];
  for (let i = sortedPoints.length - 1; i >= 0; i--) {
    const p = sortedPoints[i];
    while (
      upper.length >= 2 &&
      crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Concatenate lower and upper hulls
  // Remove duplicate point (last of lower is first of upper)
  lower.pop();
  const hull = lower.concat(upper);

  return hull;
}
