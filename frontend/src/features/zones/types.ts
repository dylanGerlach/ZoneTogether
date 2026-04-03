export type ZoneMode = "view" | "freehand";

export type MapPoint = {
  latitude: number;
  longitude: number;
};

export type GeoJSONPosition = [number, number];

export interface ZonePolygonGeometry {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
}

export interface ZoneMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: GeoJSONPosition[][][];
}

export type ZoneGeometry = ZonePolygonGeometry | ZoneMultiPolygonGeometry;

export interface ZoneFeatureProperties {
  name?: string;
  created_at?: string;
  adjusted?: boolean;
  originalZoneId?: string;
  note?: string;
  [key: string]: unknown;
}

export interface ZoneFeature {
  type: "Feature";
  id?: string;
  properties: ZoneFeatureProperties;
  geometry: ZoneGeometry;
}

export interface ZoneFeatureCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

export interface OverlapDetectedPayload {
  error: "overlap_detected";
  overlappingZone: ZoneFeature;
  overlappingZones?: ZoneFeature[];
  newZone: ZoneFeature;
}
