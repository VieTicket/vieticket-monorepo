/**
 * Calculate the center point of a polygon based on its points
 * @param points - Array of polygon points
 * @returns Center point as {x, y}
 */
export const calculatePolygonCenter = (
  points: { x: number; y: number }[]
): { x: number; y: number } => {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const totalX = points.reduce((sum, point) => sum + point.x, 0);
  const totalY = points.reduce((sum, point) => sum + point.y, 0);

  return {
    x: totalX / points.length,
    y: totalY / points.length,
  };
};

/**
 * Calculate the centroid of a polygon (geometric center)
 * This is more accurate for irregular polygons than simple average
 * @param points - Array of polygon points
 * @returns Centroid point as {x, y}
 */
export const calculatePolygonCentroid = (
  points: { x: number; y: number }[]
): { x: number; y: number } => {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return { ...points[0] };
  }

  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }

  let area = 0;
  let centroidX = 0;
  let centroidY = 0;

  // Calculate using the shoelace formula
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;

    const crossProduct = xi * yj - xj * yi;
    area += crossProduct;
    centroidX += (xi + xj) * crossProduct;
    centroidY += (yi + yj) * crossProduct;
  }

  area = area / 2;

  // If area is 0 (degenerate polygon), fall back to simple average
  if (Math.abs(area) < 1e-10) {
    return calculatePolygonCenter(points);
  }

  centroidX = centroidX / (6 * area);
  centroidY = centroidY / (6 * area);

  return {
    x: centroidX,
    y: centroidY,
  };
};
