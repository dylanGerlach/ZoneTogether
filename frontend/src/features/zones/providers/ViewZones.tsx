import React from "react";
import { Polygon } from "react-native-maps";

import type { ZoneFeature } from "../types";
import { toMapPoint } from "../utils/geometry";

type ViewZonesProps = {
  zones: ZoneFeature[];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  getZoneStyle?: (
    zone: ZoneFeature,
    index: number,
  ) => {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
};

export const ViewZones: React.FC<ViewZonesProps> = ({
  zones,
  fillColor = "rgba(0,122,255,0.20)",
  strokeColor = "rgba(0,122,255,0.8)",
  strokeWidth = 2,
  getZoneStyle,
}) => {
  return (
    <>
      {zones.map((zone, index) => {
        const zoneStyle = getZoneStyle?.(zone, index);
        const effectiveFillColor = zoneStyle?.fillColor ?? fillColor;
        const effectiveStrokeColor = zoneStyle?.strokeColor ?? strokeColor;
        const effectiveStrokeWidth = zoneStyle?.strokeWidth ?? strokeWidth;
        const polygons =
          zone.geometry.type === "Polygon"
            ? [zone.geometry.coordinates]
            : zone.geometry.coordinates;

        return polygons.map((poly, polyIndex) => {
          const outer = poly[0] ?? [];
          if (outer.length < 4) return null;

          const holeRings = poly.slice(1).filter((ring) => ring.length >= 4);
          return (
            <Polygon
              key={`${String(zone.id ?? `zone-${index}`)}-${polyIndex}`}
              coordinates={outer.map(toMapPoint)}
              holes={holeRings.map((ring) => ring.map(toMapPoint))}
              fillColor={effectiveFillColor}
              strokeColor={effectiveStrokeColor}
              strokeWidth={effectiveStrokeWidth}
            />
          );
        });
      })}
    </>
  );
};
