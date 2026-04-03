import type { Request, Response } from "express";
import { cellToBoundary, polygonToCells } from "h3-js";

import type {
  ApiErrorResponse,
  GenerateH3GridRequest,
  GenerateH3GridResponse,
  GeoJSONPosition,
} from "../../contracts/backend-api.types.js";

function isValidPosition(value: unknown): value is GeoJSONPosition {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function closeRing(ring: GeoJSONPosition[]): GeoJSONPosition[] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export async function generateH3Grid(
  req: Request<{}, GenerateH3GridResponse | ApiErrorResponse, GenerateH3GridRequest>,
  res: Response<GenerateH3GridResponse | ApiErrorResponse>,
) {
  const polygon = req.body?.polygon;
  const resolution = req.body?.resolution ?? 9;

  if (!Array.isArray(polygon) || polygon.length < 3 || !polygon.every(isValidPosition)) {
    return res.status(400).json({ error: "polygon must contain at least 3 [lon, lat] points" });
  }

  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    return res.status(400).json({ error: "resolution must be an integer between 0 and 15" });
  }

  try {
    const closedPolygon = closeRing(polygon);
    const cells = polygonToCells(closedPolygon, resolution, true);

    const features = cells.map((h3Index) => {
      const boundary = cellToBoundary(h3Index, true) as GeoJSONPosition[];
      const closedBoundary = closeRing(boundary);
      return {
        type: "Feature" as const,
        properties: {
          h3Index,
          resolution,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [closedBoundary],
        },
      };
    });

    return res.status(200).json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Failed to generate H3 cells:", error);
    return res.status(500).json({ error: "Failed to generate H3 grid" });
  }
}
