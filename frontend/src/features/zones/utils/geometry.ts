import type { GeoJSONPosition, MapPoint, ZoneFeature } from "../types";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(a: MapPoint, b: MapPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const haversine =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function smoothPath(path: MapPoint[], minDistanceMeters = 4): MapPoint[] {
  if (path.length < 2) return path;

  const smoothed: MapPoint[] = [path[0]];
  for (let i = 1; i < path.length; i += 1) {
    const previous = smoothed[smoothed.length - 1];
    if (haversineDistanceMeters(previous, path[i]) >= minDistanceMeters) {
      smoothed.push(path[i]);
    }
  }

  return smoothed;
}

function movingAverageSmooth(path: MapPoint[], windowSize = 3): MapPoint[] {
  if (path.length < windowSize) return path;

  const radius = Math.floor(windowSize / 2);
  return path.map((point, index) => {
    if (index === 0 || index === path.length - 1) return point;

    let latSum = 0;
    let lonSum = 0;
    let count = 0;
    for (let i = index - radius; i <= index + radius; i += 1) {
      if (i < 0 || i >= path.length) continue;
      latSum += path[i].latitude;
      lonSum += path[i].longitude;
      count += 1;
    }

    return {
      latitude: latSum / count,
      longitude: lonSum / count,
    };
  });
}

function perpendicularDistance(point: MapPoint, start: MapPoint, end: MapPoint): number {
  if (start.latitude === end.latitude && start.longitude === end.longitude) {
    return haversineDistanceMeters(point, start);
  }

  const x0 = point.longitude;
  const y0 = point.latitude;
  const x1 = start.longitude;
  const y1 = start.latitude;
  const x2 = end.longitude;
  const y2 = end.latitude;

  const numerator = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const denominator = Math.hypot(y2 - y1, x2 - x1);

  return numerator / denominator;
}

export function simplifyDouglasPeucker(path: MapPoint[], epsilon = 0.00002): MapPoint[] {
  if (path.length < 3) return path;

  let maxDistance = 0;
  let index = 0;
  const first = path[0];
  const last = path[path.length - 1];

  for (let i = 1; i < path.length - 1; i += 1) {
    const distance = perpendicularDistance(path[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = simplifyDouglasPeucker(path.slice(0, index + 1), epsilon);
    const right = simplifyDouglasPeucker(path.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

export function toGeoJSONPosition(point: MapPoint): GeoJSONPosition {
  return [point.longitude, point.latitude];
}

export function toMapPoint(position: GeoJSONPosition): MapPoint {
  return {
    latitude: position[1],
    longitude: position[0],
  };
}

export function ensureClosedRing(points: GeoJSONPosition[]): GeoJSONPosition[] {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

export function buildPolygonFeature(path: MapPoint[], name: string): ZoneFeature | null {
  if (path.length < 3) return null;

  const filtered = smoothPath(path, 2.5);
  const averaged = movingAverageSmooth(filtered, 3);
  const simplified =
    averaged.length > 12 ? simplifyDouglasPeucker(averaged, 0.00001) : averaged;

  if (simplified.length < 3) return null;

  const ring = ensureClosedRing(simplified.map(toGeoJSONPosition));
  if (ring.length < 4) return null;

  return {
    type: "Feature",
    properties: {
      name,
      created_at: new Date().toISOString(),
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}
