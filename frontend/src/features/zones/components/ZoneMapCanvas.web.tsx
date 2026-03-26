import "leaflet/dist/leaflet.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  MapContainer,
  Polygon as LeafletPolygon,
  Polyline as LeafletPolyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";

import { Text } from "../../../components";
import { colors, spacing } from "../../../theme";
import { toMapPoint } from "../utils/geometry";
import type { ZoneMapAdapterProps } from "../types/map-adapter";

type DrawInteractionProps = {
  enabled: boolean;
  onAppendCoordinate: ZoneMapAdapterProps["onAppendCoordinate"];
  onSetDrawing: ZoneMapAdapterProps["onSetDrawing"];
};

const DrawInteraction: React.FC<DrawInteractionProps> = ({
  enabled,
  onAppendCoordinate,
  onSetDrawing,
}) => {
  const isDraggingRef = useRef(false);

  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      if (!enabled) return;
      onAppendCoordinate({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
    mousedown: (event: LeafletMouseEvent) => {
      if (!enabled) return;
      isDraggingRef.current = true;
      onSetDrawing(true);
      onAppendCoordinate({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
    mousemove: (event: LeafletMouseEvent) => {
      if (!enabled || !isDraggingRef.current) return;
      onAppendCoordinate({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
    mouseup: () => {
      if (!enabled) return;
      isDraggingRef.current = false;
      onSetDrawing(false);
    },
  });

  return null;
};

type BehaviorSyncProps = {
  drawMode: boolean;
};

const BehaviorSync: React.FC<BehaviorSyncProps> = ({ drawMode }) => {
  const map = useMap();

  useEffect(() => {
    if (drawMode) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.touchZoom.enable();
    }
  }, [drawMode, map]);

  return null;
};

type ZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut }) => {
  return (
    <View style={styles.zoomControls}>
      <TouchableOpacity style={styles.zoomButton} onPress={onZoomIn} activeOpacity={0.8}>
        <Text variant="h3" color="textPrimary">
          +
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.zoomButton} onPress={onZoomOut} activeOpacity={0.8}>
        <Text variant="h3" color="textPrimary">
          -
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const UnsafeMapContainer = MapContainer as unknown as React.ComponentType<any>;
const UnsafeTileLayer = TileLayer as unknown as React.ComponentType<any>;

export const ZoneMapCanvas: React.FC<ZoneMapAdapterProps> = ({
  mode,
  path,
  visibleZones,
  mapHeight,
  initialRegion,
  getZoneStyle,
  onAppendCoordinate,
  onSetDrawing,
}) => {
  const [zoom, setZoom] = useState(13);
  const mapRef = useRef<any>(null);

  const pathPositions = useMemo(() => path.map((point) => [point.latitude, point.longitude] as [number, number]), [path]);

  return (
    <View style={[styles.mapFrame, { height: mapHeight }]}>
      <View style={styles.mapFrameHeader}>
        <Text variant="label" color="textSecondary">
          Zoning Canvas
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <UnsafeMapContainer
          ref={mapRef}
          center={[initialRegion.latitude, initialRegion.longitude]}
          zoom={zoom}
          style={styles.leafletMap as any}
        >
          <UnsafeTileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BehaviorSync drawMode={mode === "freehand"} />
          <DrawInteraction
            enabled={mode === "freehand"}
            onAppendCoordinate={onAppendCoordinate}
            onSetDrawing={onSetDrawing}
          />

          {visibleZones.map((zone, index) => {
            const style = getZoneStyle(zone, index);
            const fillColor = style.fillColor ?? "rgba(0,122,255,0.20)";
            const strokeColor = style.strokeColor ?? "rgba(0,122,255,0.8)";
            const strokeWidth = style.strokeWidth ?? 2;
            const polygons =
              zone.geometry.type === "Polygon"
                ? [zone.geometry.coordinates]
                : zone.geometry.coordinates;

            return polygons.map((poly, polyIndex) => {
              const ringPositions = poly
                .map((ring) => ring.map((position) => {
                  const point = toMapPoint(position);
                  return [point.latitude, point.longitude] as [number, number];
                }))
                .filter((ring) => ring.length >= 4);
              if (ringPositions.length === 0) return null;

              return (
                <LeafletPolygon
                  key={`${String(zone.id ?? `zone-${index}`)}-${polyIndex}`}
                  positions={ringPositions}
                  pathOptions={{
                    color: strokeColor,
                    weight: strokeWidth,
                    fillColor,
                    fillOpacity: 0.7,
                  }}
                />
              );
            });
          })}

          {pathPositions.length > 1 ? (
            <LeafletPolyline positions={pathPositions} pathOptions={{ color: "rgba(220,38,38,0.95)", weight: 3 }} />
          ) : null}
          {pathPositions.length > 2 ? (
            <LeafletPolygon
              positions={pathPositions}
              pathOptions={{
                color: "rgba(220,38,38,0.85)",
                weight: 2,
                fillColor: "rgba(220,38,38,0.2)",
                fillOpacity: 0.8,
              }}
            />
          ) : null}
        </UnsafeMapContainer>

        <View style={styles.modePill}>
          <Text variant="label" color="white">
            {mode === "freehand" ? `Draw Mode • ${path.length} points` : "View Mode"}
          </Text>
        </View>
        <ZoomControls
          onZoomIn={() => {
            const next = Math.min(19, zoom + 1);
            setZoom(next);
            mapRef.current?.setZoom(next);
          }}
          onZoomOut={() => {
            const next = Math.max(3, zoom - 1);
            setZoom(next);
            mapRef.current?.setZoom(next);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapFrame: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.gray300,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
    minHeight: 460,
  },
  mapFrameHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.gray100,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: colors.border,
    minHeight: 420,
    position: "relative",
  },
  leafletMap: {
    width: "100%",
    height: "100%",
  },
  modePill: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.md,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 500,
  },
  zoomControls: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
    zIndex: 500,
  },
  zoomButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
