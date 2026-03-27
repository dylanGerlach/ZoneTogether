import type { MapPoint, ZoneFeature, ZoneMode } from "../types";

export type ZoneMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ZoneStyleResolver = (
  zone: ZoneFeature,
  index: number,
) => {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

export type ZoneMapAdapterProps = {
  mode: ZoneMode;
  path: MapPoint[];
  visibleZones: ZoneFeature[];
  mapHeight: number;
  initialRegion: ZoneMapRegion;
  getZoneStyle: ZoneStyleResolver;
  onAppendCoordinate: (point: MapPoint) => void;
  onSetDrawing: (drawing: boolean) => void;
};
