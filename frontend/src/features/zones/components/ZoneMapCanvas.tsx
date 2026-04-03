import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, {
  MapPressEvent,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";

import { Text } from "../../../components";
import { colors, spacing } from "../../../theme";
import { ViewZones } from "../providers/ViewZones";
import type { ZoneMapAdapterProps } from "../types/map-adapter";

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
  const mapRef = useRef<MapView | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(initialRegion);
  const mapProvider = PROVIDER_GOOGLE;

  const zoomByFactor = useCallback(
    (factor: number) => {
      const nextRegion: Region = {
        ...mapRegion,
        latitudeDelta: Math.min(Math.max(mapRegion.latitudeDelta * factor, 0.002), 1.2),
        longitudeDelta: Math.min(Math.max(mapRegion.longitudeDelta * factor, 0.002), 1.2),
      };
      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 180);
    },
    [mapRegion],
  );

  const frameStyle = useMemo(() => [styles.mapFrame, { height: mapHeight }], [mapHeight]);

  return (
    <View style={frameStyle}>
      <View style={styles.mapFrameHeader}>
        <Text variant="label" color="textSecondary">
          Zoning Canvas
        </Text>
      </View>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={mapProvider}
          initialRegion={initialRegion}
          onRegionChangeComplete={(region) => setMapRegion(region)}
          showsUserLocation
          scrollEnabled={mode !== "freehand"}
          zoomEnabled={mode !== "freehand"}
          rotateEnabled={mode !== "freehand"}
          pitchEnabled={mode !== "freehand"}
          onPanDrag={(event: MapPressEvent) => {
            if (mode !== "freehand") return;
            onSetDrawing(true);
            onAppendCoordinate(event.nativeEvent.coordinate);
          }}
          onPress={(event: MapPressEvent) => {
            if (mode !== "freehand") return;
            onAppendCoordinate(event.nativeEvent.coordinate);
          }}
          onTouchEnd={() => {
            onSetDrawing(false);
          }}
        >
          <ViewZones zones={visibleZones} getZoneStyle={getZoneStyle} />
          {path.length > 1 ? (
            <Polyline coordinates={path} strokeColor="rgba(220,38,38,0.95)" strokeWidth={3} />
          ) : null}
          {path.length > 2 ? (
            <Polygon
              coordinates={path}
              fillColor="rgba(220,38,38,0.2)"
              strokeColor="rgba(220,38,38,0.85)"
              strokeWidth={2}
            />
          ) : null}
        </MapView>
        <View style={styles.modePill}>
          <Text variant="label" color="white">
            {mode === "freehand" ? `Draw Mode • ${path.length} points` : "View Mode"}
          </Text>
        </View>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => zoomByFactor(0.7)}
            activeOpacity={0.8}
          >
            <Text variant="h3" color="textPrimary">
              +
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => zoomByFactor(1.35)}
            activeOpacity={0.8}
          >
            <Text variant="h3" color="textPrimary">
              -
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  modePill: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.md,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  zoomControls: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
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
