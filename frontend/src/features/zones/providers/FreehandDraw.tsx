import { useRef, useState } from "react";

import type { MapPoint, ZoneFeature } from "../types";
import { buildPolygonFeature, haversineDistanceMeters } from "../utils/geometry";

type UseFreehandDrawArgs = {
  enabled: boolean;
};

type UseFreehandDrawResult = {
  path: MapPoint[];
  isDrawing: boolean;
  setDrawing: (drawing: boolean) => void;
  appendCoordinate: (point: MapPoint) => void;
  clearPath: () => void;
  buildFeatureFromPath: (zoneName: string) => ZoneFeature | null;
};

export function useFreehandDraw({
  enabled,
}: UseFreehandDrawArgs): UseFreehandDrawResult {
  const [path, setPath] = useState<MapPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<MapPoint | null>(null);

  const clearPath = () => {
    setPath([]);
    lastPointRef.current = null;
    setIsDrawing(false);
  };

  const appendCoordinate = (point: MapPoint) => {
    if (!enabled) return;

    if (lastPointRef.current) {
      const movedDistance = haversineDistanceMeters(lastPointRef.current, point);
      if (movedDistance < 2) return;
    }

    lastPointRef.current = point;
    setPath((previous) => [...previous, point]);
  };

  const buildFeatureFromPath = (zoneName: string): ZoneFeature | null => {
    return buildPolygonFeature(path, zoneName);
  };

  return {
    path,
    isDrawing,
    setDrawing: setIsDrawing,
    appendCoordinate,
    clearPath,
    buildFeatureFromPath,
  };
}
