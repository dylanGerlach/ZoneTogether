import type { Request, Response } from "express";
import {
  area,
  booleanIntersects,
  booleanValid,
  cleanCoords,
  difference,
  featureCollection,
  intersect,
  multiPolygon,
  polygon,
} from "@turf/turf";

import { InMemoryZoneRepository } from "../../db/zones.db.js";
import type {
  AdjustZoneErrorCode,
  AdjustZoneErrorResponse,
  AdjustZoneRequest,
  AdjustZoneResponse,
  ApiErrorResponse,
  CreateZoneRequest,
  CreateZoneResponse,
  DeleteZoneResponse,
  GetZonesResponse,
  OverlapDetectedResponse,
  UpdateZoneRequest,
  UpdateZoneResponse,
  UUID,
  ZoneFeature,
  ZoneGeometry,
  ZoneNameTakenResponse,
} from "../../contracts/backend-api.types.js";

const zoneRepository = new InMemoryZoneRepository();
const MIN_ADJUSTED_AREA = 1e-7;
const AREA_EPSILON = 1e-9;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isZoneFeature(value: unknown): value is ZoneFeature {
  if (!value || typeof value !== "object") return false;
  const feature = value as ZoneFeature;
  const geometryType = feature.geometry?.type;

  return (
    feature.type === "Feature" &&
    !!feature.geometry &&
    (geometryType === "Polygon" || geometryType === "MultiPolygon") &&
    Array.isArray(feature.geometry.coordinates)
  );
}

function closeRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function normalizeGeometry(geometry: ZoneGeometry): ZoneGeometry {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => closeRing(ring as number[][]) as [number, number][]),
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polyRings) =>
      polyRings.map((ring) => closeRing(ring as number[][]) as [number, number][])
    ),
  };
}

function normalizeFeature(feature: ZoneFeature): ZoneFeature {
  const geometry = normalizeGeometry(feature.geometry);
  return {
    ...feature,
    properties: feature.properties ?? {},
    geometry,
  };
}

function getNormalizedZoneName(feature: ZoneFeature): string | null {
  const rawName = feature.properties?.name;
  if (typeof rawName !== "string") return null;
  const normalizedName = rawName.trim();
  return normalizedName.length > 0 ? normalizedName : null;
}

function findZoneByName(
  organizationId: UUID,
  zoneName: string,
  excludeZoneId?: string,
): ZoneFeature | null {
  const normalizedTarget = zoneName.trim().toLowerCase();
  if (normalizedTarget.length === 0) return null;

  const existingZones = zoneRepository.listByOrganization(organizationId);
  return (
    existingZones.find((zone) => {
      const existingName = typeof zone.properties?.name === "string" ? zone.properties.name.trim() : "";
      if (existingName.length === 0) return false;
      if (excludeZoneId && String(zone.id) === excludeZoneId) return false;
      return existingName.toLowerCase() === normalizedTarget;
    }) ?? null
  );
}

function toTurfFeature(feature: ZoneFeature) {
  if (feature.geometry.type === "MultiPolygon") {
    return multiPolygon(feature.geometry.coordinates as number[][][][]);
  }
  return polygon(feature.geometry.coordinates as number[][][]);
}

function hasDisallowedOverlap(
  newGeometry: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
  existingGeometry: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
): boolean {
  const intersectsGeometry = safeBooleanIntersects(newGeometry, existingGeometry);
  if (!intersectsGeometry) return false;

  const sharedArea = safeIntersect(newGeometry, existingGeometry);
  if (!sharedArea) return false;

  // Shared boundaries are valid; only reject positive-area overlap.
  return area(sharedArea) > MIN_ADJUSTED_AREA;
}

function toAdjustedGeometryFromDifference(diffGeometry: unknown): ZoneGeometry | null {
  if (!diffGeometry) return null;

  if (typeof diffGeometry !== "object" || !("type" in diffGeometry) || !("coordinates" in diffGeometry)) {
    return null;
  }

  if (diffGeometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: diffGeometry.coordinates as [number, number][][],
    };
  }

  if (diffGeometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: diffGeometry.coordinates as [number, number][][][],
    };
  }

  return null;
}

function normalizeRing(ring: [number, number][]): [number, number][] | null {
  const closed = closeRing(ring as number[][]) as [number, number][];
  const deduped: [number, number][] = [];
  for (const point of closed) {
    const previous = deduped[deduped.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      deduped.push(point);
    }
  }
  if (deduped.length < 4) return null;
  const uniquePoints = new Set(deduped.map((point) => `${point[0]},${point[1]}`));
  if (uniquePoints.size < 3) return null;
  return deduped;
}

function sanitizeZoneGeometry(geometry: ZoneGeometry): ZoneGeometry | null {
  if (geometry.type === "Polygon") {
    const [outerRing, ...holes] = geometry.coordinates;
    const normalizedOuter = normalizeRing(outerRing as [number, number][]);
    if (!normalizedOuter) return null;
    const normalizedHoles = holes
      .map((ring) => normalizeRing(ring as [number, number][]))
      .filter((ring): ring is [number, number][] => Boolean(ring));
    return {
      type: "Polygon",
      coordinates: [normalizedOuter, ...normalizedHoles],
    };
  }

  const polygons = geometry.coordinates
    .map((poly) => {
      const [outerRing, ...holes] = poly;
      const normalizedOuter = normalizeRing(outerRing as [number, number][]);
      if (!normalizedOuter) return null;
      const normalizedHoles = holes
        .map((ring) => normalizeRing(ring as [number, number][]))
        .filter((ring): ring is [number, number][] => Boolean(ring));
      return [normalizedOuter, ...normalizedHoles];
    })
    .filter((poly): poly is [number, number][][] => Boolean(poly))
    .filter((poly) => poly.length > 0);

  if (polygons.length === 0) return null;
  return {
    type: "MultiPolygon",
    coordinates: polygons,
  };
}

function safeCleanCoords<T>(feature: T): T | null {
  try {
    return cleanCoords(feature as any) as T;
  } catch {
    return null;
  }
}

function safeBooleanIntersects(
  left: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
  right: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
): boolean {
  try {
    return booleanIntersects(left, right);
  } catch {
    return false;
  }
}

function safeIntersect(
  left: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
  right: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
) {
  try {
    return intersect(featureCollection([left as any, right as any]) as any);
  } catch {
    return null;
  }
}

function safeDifference(
  left: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
  right: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
) {
  try {
    return difference(featureCollection([left as any, right as any]));
  } catch {
    return null;
  }
}

function overlapAreaBetween(
  left: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
  right: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
): number {
  const overlap = safeIntersect(left, right);
  if (!overlap) return 0;
  try {
    return area(overlap);
  } catch {
    return 0;
  }
}

function collectAutoOverlapZoneIds(
  organizationId: UUID,
  candidateGeometry: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
): string[] {
  const existingZones = zoneRepository.listByOrganization(organizationId);
  const overlapCandidates: Array<{ id: string; overlapArea: number }> = [];

  for (const zone of existingZones) {
    if (!isZoneFeature(zone) || !zone.id) continue;
    const normalizedZone = normalizeFeature(zone);
    const sanitizedZoneGeometry = sanitizeZoneGeometry(normalizedZone.geometry);
    if (!sanitizedZoneGeometry) continue;

    const zoneGeometry = safeCleanCoords(
      toTurfFeature({
        ...normalizedZone,
        geometry: sanitizedZoneGeometry,
      }),
    );
    if (!zoneGeometry || !booleanValid(zoneGeometry)) continue;

    const overlapArea = overlapAreaBetween(candidateGeometry, zoneGeometry);
    if (overlapArea > MIN_ADJUSTED_AREA) {
      overlapCandidates.push({
        id: String(zone.id),
        overlapArea,
      });
    }
  }

  // Process largest overlaps first to reduce geometry fragmentation.
  overlapCandidates.sort((a, b) => b.overlapArea - a.overlapArea);
  return overlapCandidates.map((candidate) => candidate.id);
}

function isFullyWithinExisting(
  candidate: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
  existing: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
): boolean {
  const candidateArea = area(candidate);
  if (candidateArea <= AREA_EPSILON) return false;

  const overlap = safeIntersect(candidate, existing);
  if (!overlap) return false;

  const overlapArea = area(overlap);
  return overlapArea >= candidateArea - AREA_EPSILON;
}

function sendAdjustError(
  res: Response<AdjustZoneResponse | AdjustZoneErrorResponse | ApiErrorResponse>,
  status: number,
  code: AdjustZoneErrorCode,
  error: string,
) {
  return res.status(status).json({ code, error });
}

function toZoneGeometryFromTurfFeature(
  turfFeature: ReturnType<typeof polygon> | ReturnType<typeof multiPolygon>,
): ZoneGeometry {
  if (turfFeature.geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: turfFeature.geometry.coordinates as [number, number][][][],
    };
  }

  return {
    type: "Polygon",
    coordinates: turfFeature.geometry.coordinates as [number, number][][],
  };
}

export async function getZones(
  req: Request<{}, GetZonesResponse | ApiErrorResponse, {}, { organizationId?: UUID }>,
  res: Response<GetZonesResponse | ApiErrorResponse>,
) {
  const organizationId = req.query.organizationId;
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  const features = zoneRepository.listByOrganization(organizationId as UUID);
  return res.status(200).json({
    type: "FeatureCollection",
    features,
  });
}

export async function createZone(
  req: Request<
    {},
    CreateZoneResponse | OverlapDetectedResponse | ZoneNameTakenResponse | ApiErrorResponse,
    CreateZoneRequest
  >,
  res: Response<CreateZoneResponse | OverlapDetectedResponse | ZoneNameTakenResponse | ApiErrorResponse>,
) {
  const { organizationId, feature } = req.body ?? {};

  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  if (!isZoneFeature(feature)) {
    return res.status(400).json({ error: "Invalid zone geometry" });
  }

  const normalizedFeature = normalizeFeature(feature);
  const zoneName = getNormalizedZoneName(normalizedFeature);
  if (!zoneName) {
    return res.status(400).json({ error: "Zone name is required" });
  }
  normalizedFeature.properties = {
    ...normalizedFeature.properties,
    name: zoneName,
  };
  const existingWithName = findZoneByName(organizationId as UUID, zoneName);
  if (existingWithName) {
    return res.status(409).json({
      error: "zone_name_taken",
      existingZoneId: String(existingWithName.id ?? ""),
      existingZoneName: String(existingWithName.properties?.name ?? zoneName),
    });
  }

  const newPolygon = toTurfFeature(normalizedFeature);
  const existingZones = zoneRepository.listByOrganization(organizationId as UUID);
  const overlappingZones: ZoneFeature[] = [];

  for (const existingZone of existingZones) {
    if (!isZoneFeature(existingZone)) continue;
    const existingPolygon = toTurfFeature(normalizeFeature(existingZone));

    if (hasDisallowedOverlap(newPolygon, existingPolygon)) {
      overlappingZones.push(existingZone);
    }
  }

  if (overlappingZones.length > 0) {
    return res.status(409).json({
      error: "overlap_detected",
      overlappingZone: overlappingZones[0],
      overlappingZones,
      newZone: normalizedFeature,
    });
  }

  const created = zoneRepository.create(organizationId as UUID, normalizedFeature);
  return res.status(200).json({
    ok: true,
    id: String(created.id),
  });
}

export async function updateZone(
  req: Request<
    { zoneId: string },
    UpdateZoneResponse | OverlapDetectedResponse | ZoneNameTakenResponse | ApiErrorResponse,
    UpdateZoneRequest
  >,
  res: Response<UpdateZoneResponse | OverlapDetectedResponse | ZoneNameTakenResponse | ApiErrorResponse>,
) {
  const zoneId = req.params.zoneId;
  const { organizationId, feature } = req.body ?? {};

  if (!isNonEmptyString(zoneId)) {
    return res.status(400).json({ error: "zoneId is required" });
  }
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }
  if (!isZoneFeature(feature)) {
    return res.status(400).json({ error: "Invalid zone geometry" });
  }

  const existingZone = zoneRepository.findById(organizationId as UUID, zoneId);
  if (!existingZone) {
    return res.status(404).json({ error: "Zone not found" });
  }

  const normalizedFeature = normalizeFeature(feature);
  const zoneName = getNormalizedZoneName(normalizedFeature);
  if (!zoneName) {
    return res.status(400).json({ error: "Zone name is required" });
  }
  normalizedFeature.properties = {
    ...normalizedFeature.properties,
    name: zoneName,
  };

  const existingWithName = findZoneByName(organizationId as UUID, zoneName, zoneId);
  if (existingWithName) {
    return res.status(409).json({
      error: "zone_name_taken",
      existingZoneId: String(existingWithName.id ?? ""),
      existingZoneName: String(existingWithName.properties?.name ?? zoneName),
    });
  }

  const newPolygon = toTurfFeature(normalizedFeature);
  const existingZones = zoneRepository.listByOrganization(organizationId as UUID);
  const overlappingZones: ZoneFeature[] = [];
  for (const zone of existingZones) {
    if (String(zone.id) === zoneId || !isZoneFeature(zone)) continue;
    const existingPolygon = toTurfFeature(normalizeFeature(zone));
    if (hasDisallowedOverlap(newPolygon, existingPolygon)) {
      overlappingZones.push(zone);
    }
  }

  if (overlappingZones.length > 0) {
    return res.status(409).json({
      error: "overlap_detected",
      overlappingZone: overlappingZones[0],
      overlappingZones,
      newZone: normalizedFeature,
    });
  }

  const updated = zoneRepository.update(organizationId as UUID, zoneId, normalizedFeature);
  if (!updated) {
    return res.status(404).json({ error: "Zone not found" });
  }

  return res.status(200).json({
    ok: true,
    id: String(updated.id),
    updated: true,
  });
}

export async function adjustZone(
  req: Request<{}, AdjustZoneResponse | AdjustZoneErrorResponse | ApiErrorResponse, AdjustZoneRequest>,
  res: Response<AdjustZoneResponse | AdjustZoneErrorResponse | ApiErrorResponse>,
) {
  const { organizationId, newZone, overlappingZoneId, overlappingZoneIds } = req.body ?? {};

  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }
  if (!isZoneFeature(newZone)) {
    return sendAdjustError(res, 400, "adjust_geometry_invalid", "Invalid zone geometry");
  }
  const targetOverlapIds = (
    Array.isArray(overlappingZoneIds)
      ? overlappingZoneIds.map((id) => String(id)).filter((id) => id.trim().length > 0)
      : isNonEmptyString(overlappingZoneId)
        ? [String(overlappingZoneId)]
        : []
  );
  if (targetOverlapIds.length === 0) {
    return sendAdjustError(
      res,
      400,
      "adjust_missing_overlap_ids",
      "overlappingZoneId or overlappingZoneIds is required",
    );
  }
  const normalizedNewZone = normalizeFeature(newZone);
  const sanitizedInputGeometry = sanitizeZoneGeometry(normalizedNewZone.geometry);
  if (!sanitizedInputGeometry) {
    return sendAdjustError(res, 400, "adjust_geometry_invalid", "Invalid zone geometry after normalization");
  }

  let cleanedAdjusted = safeCleanCoords(
    toTurfFeature({
      ...normalizedNewZone,
      geometry: sanitizedInputGeometry,
    }),
  );
  if (!cleanedAdjusted) {
    return sendAdjustError(res, 400, "adjust_geometry_invalid", "Invalid zone geometry after cleanup");
  }
  if (!booleanValid(cleanedAdjusted)) {
    return sendAdjustError(res, 400, "adjust_geometry_invalid", "Invalid zone geometry after cleanup");
  }

  const autoOverlapIds = collectAutoOverlapZoneIds(organizationId as UUID, cleanedAdjusted);
  const effectiveOverlapIds = Array.from(new Set([...targetOverlapIds, ...autoOverlapIds]));
  if (effectiveOverlapIds.length === 0) {
    return sendAdjustError(
      res,
      400,
      "adjust_missing_overlap_ids",
      "Could not identify overlapping zones to adjust around",
    );
  }

  for (const overlapId of effectiveOverlapIds) {
    const overlappingZone = zoneRepository.findById(organizationId as UUID, overlapId);
    if (!overlappingZone) {
      return sendAdjustError(res, 404, "adjust_overlap_zone_missing", "Overlapping zone not found");
    }
    const normalizedExisting = normalizeFeature(overlappingZone);
    const sanitizedExistingGeometry = sanitizeZoneGeometry(normalizedExisting.geometry);
    if (!sanitizedExistingGeometry) {
      return sendAdjustError(res, 400, "adjust_geometry_invalid", "Overlapping zone has invalid geometry");
    }

    const existingPolygon = safeCleanCoords(
      toTurfFeature({
        ...normalizedExisting,
        geometry: sanitizedExistingGeometry,
      }),
    );
    if (!existingPolygon) {
      return sendAdjustError(
        res,
        400,
        "adjust_geometry_invalid",
        "Invalid overlapping zone geometry after cleanup",
      );
    }

    if (!booleanValid(existingPolygon)) {
      return sendAdjustError(
        res,
        400,
        "adjust_geometry_invalid",
        "Invalid overlapping zone geometry after cleanup",
      );
    }

    if (!safeBooleanIntersects(cleanedAdjusted, existingPolygon)) {
      // Geometry may have shifted after prior adjustments; skip non-overlapping zones safely.
      continue;
    }

    if (isFullyWithinExisting(cleanedAdjusted, existingPolygon)) {
      return sendAdjustError(
        res,
        400,
        "adjust_inside_zone",
        "Your zone is completely inside an existing zone and cannot be adjusted around it.",
      );
    }

    const diff = safeDifference(cleanedAdjusted, existingPolygon);
    if (!diff?.geometry) {
      return sendAdjustError(
        res,
        400,
        "adjust_overlap_processing_failed",
        "Could not create adjusted zone from overlap",
      );
    }

    const adjustedGeometry = toAdjustedGeometryFromDifference(diff.geometry);
    if (!adjustedGeometry) {
      return sendAdjustError(
        res,
        400,
        "adjust_overlap_processing_failed",
        "Could not create adjusted zone from overlap",
      );
    }

    const sanitizedAdjustedGeometry = sanitizeZoneGeometry(adjustedGeometry);
    if (!sanitizedAdjustedGeometry) {
      return sendAdjustError(
        res,
        400,
        "adjust_overlap_processing_failed",
        "Could not create adjusted zone from overlap",
      );
    }

    const adjustedFeature: ZoneFeature = {
      type: "Feature",
      properties: {},
      geometry: sanitizedAdjustedGeometry,
    };
    const nextCleanedAdjusted = safeCleanCoords(toTurfFeature(adjustedFeature));
    if (!nextCleanedAdjusted) {
      return sendAdjustError(res, 400, "adjust_geometry_invalid", "Adjusted zone is invalid after cleanup");
    }
    cleanedAdjusted = nextCleanedAdjusted;
    if (!booleanValid(cleanedAdjusted)) {
      return sendAdjustError(res, 400, "adjust_geometry_invalid", "Adjusted zone is invalid after cleanup");
    }
  }

  const adjustedArea = area(cleanedAdjusted);
  if (adjustedArea <= MIN_ADJUSTED_AREA) {
    return sendAdjustError(res, 400, "adjust_too_small", "Adjusted zone is too small to save safely");
  }

  const adjustedZone: ZoneFeature = {
    type: "Feature",
    id: `zone-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
    properties: {
      ...normalizedNewZone.properties,
      adjusted: true,
      originalZoneId: effectiveOverlapIds.join(","),
      note: "Zone adjusted to wrap around overlapping zones",
    },
    geometry: {
      ...toZoneGeometryFromTurfFeature(cleanedAdjusted),
    },
  };

  return res.status(200).json({
    ok: true,
    adjustedZone,
  });
}

export async function deleteZone(
  req: Request<{ zoneId: string }, DeleteZoneResponse | ApiErrorResponse, unknown, { organizationId?: UUID }>,
  res: Response<DeleteZoneResponse | ApiErrorResponse>,
) {
  const organizationId = req.query.organizationId;
  const zoneId = req.params.zoneId;

  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }
  if (!isNonEmptyString(zoneId)) {
    return res.status(400).json({ error: "zoneId is required" });
  }

  const deleted = zoneRepository.delete(organizationId as UUID, zoneId);
  if (!deleted) {
    return res.status(404).json({ error: "Zone not found" });
  }

  return res.status(200).json({
    ok: true,
    deletedId: String(deleted.id),
  });
}
