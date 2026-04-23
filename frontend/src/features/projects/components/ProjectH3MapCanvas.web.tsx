import "leaflet/dist/leaflet.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Polygon as LeafletPolygon, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { cellToBoundary, cellToLatLng } from "h3-js";

import { Text } from "../../../components";
import { colors, spacing } from "../../../theme";
import type { ProjectMapTeamSnapshot, UUID } from "../../../types";

type ProjectH3MapCanvasWebProps = {
  teams: ProjectMapTeamSnapshot[];
  activeTeamId: UUID | null;
  setActiveTeamId: (teamId: UUID) => void;
  canEdit: boolean;
  isAdmin?: boolean;
  onToggleEditMode?: () => void;
  savingMap: boolean;
  creatingTeam: boolean;
  onCreateTeam: () => void;
  onMapClick: (latitude: number, longitude: number) => void;
  focusCell?: string | null;
  initialCenter?: [number, number] | null;
  initialZoom?: number | null;
};

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194];
const DEFAULT_ZOOM = 10;

type MapClickProps = {
  enabled: boolean;
  onMapClick: (latitude: number, longitude: number) => void;
};

const MapClickHandler: React.FC<MapClickProps> = ({ enabled, onMapClick }) => {
  useMapEvents({
    click: (event) => {
      if (!enabled) return;
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
};

function boundaryPointToLeaflet(point: [number, number]): [number, number] {
  // h3-js with geoJson=true returns [lng, lat], Leaflet expects [lat, lng].
  return [point[1], point[0]];
}

const UnsafeMapContainer = MapContainer as unknown as React.ComponentType<any>;
const UnsafeTileLayer = TileLayer as unknown as React.ComponentType<any>;

export const ProjectH3MapCanvasWeb: React.FC<ProjectH3MapCanvasWebProps> = ({
  teams,
  activeTeamId,
  setActiveTeamId,
  canEdit,
  isAdmin = false,
  onToggleEditMode,
  savingMap,
  creatingTeam,
  onCreateTeam,
  onMapClick,
  focusCell = null,
  initialCenter = null,
  initialZoom = null,
}) => {
  const [zoom, setZoom] = useState(initialZoom ?? DEFAULT_ZOOM);
  const mapRef = useRef<any>(null);
  const [focusPulse, setFocusPulse] = useState(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  // Scale the map to the viewport so it isn't overwhelming on mobile but still
  // roomy on desktop. Mobile (<768) gets ~55vh; larger screens get ~65vh capped.
  const isCompact = windowWidth < 768;
  const mapHeight = Math.round(
    Math.max(
      320,
      Math.min(isCompact ? 520 : 720, windowHeight * (isCompact ? 0.55 : 0.65)),
    ),
  );
  // Freeze the mount-time center so late-arriving project data doesn't yank the map
  // around under an actively panning user. `useProjectH3MapController` keeps the
  // project.center_lat/lng stable across renders once loaded.
  const initialCenterRef = useRef<[number, number]>(initialCenter ?? DEFAULT_CENTER);
  useEffect(() => {
    if (initialCenter && mapRef.current?.setView) {
      const currentZoom =
        typeof mapRef.current.getZoom === "function" ? mapRef.current.getZoom() : zoom;
      mapRef.current.setView(initialCenter, initialZoom ?? currentZoom);
    }
    // Recenter when the project's stored center changes (e.g. arriving from a
    // different project that is already cached and renders before data loads).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter?.[0], initialCenter?.[1]]);

  const focusBoundary = useMemo<[number, number][] | null>(() => {
    if (!focusCell) return null;
    try {
      const boundary = cellToBoundary(focusCell, true);
      return boundary.map((point) =>
        boundaryPointToLeaflet(point as [number, number]),
      );
    } catch {
      return null;
    }
  }, [focusCell]);

  useEffect(() => {
    if (!focusCell || !mapRef.current) return;
    try {
      const [lat, lng] = cellToLatLng(focusCell);
      const currentZoom =
        typeof mapRef.current.getZoom === "function" ? mapRef.current.getZoom() : zoom;
      const targetZoom = Math.max(currentZoom, 11);
      mapRef.current.setView([lat, lng], targetZoom);
      setZoom(targetZoom);
      setFocusPulse(true);
      const timer = setTimeout(() => setFocusPulse(false), 2200);
      return () => clearTimeout(timer);
    } catch {
      return;
    }
    // Intentionally only rerun when the cell string changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCell]);

  const cellPolygons = useMemo(() => {
    const polygons: Array<{
      teamId: UUID;
      colorHex: string;
      cell: string;
      positions: [number, number][];
    }> = [];
    for (const teamSnapshot of teams) {
      for (const cell of teamSnapshot.h3Cells) {
        const boundary = cellToBoundary(cell, true);
        const positions = boundary.map((point) =>
          boundaryPointToLeaflet(point as [number, number]),
        );
        polygons.push({
          teamId: teamSnapshot.team.id,
          colorHex: teamSnapshot.team.color_hex,
          cell,
          positions,
        });
      }
    }
    return polygons;
  }, [teams]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        {isAdmin ? (
          <TouchableOpacity
            onPress={onToggleEditMode}
            activeOpacity={0.85}
            style={styles.modeToggle}
            accessibilityRole="button"
            accessibilityLabel={
              canEdit ? "Switch to view mode" : "Switch to edit mode"
            }
          >
            <View
              style={[
                styles.modeToggleSegment,
                !canEdit ? styles.modeToggleSegmentActive : null,
              ]}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={14}
                color={!canEdit ? colors.primary : colors.textSecondary}
              />
              <Text
                variant="caption"
                color={!canEdit ? "primary" : "textSecondary"}
              >
                View
              </Text>
            </View>
            <View
              style={[
                styles.modeToggleSegment,
                canEdit ? styles.modeToggleSegmentActive : null,
              ]}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={14}
                color={canEdit ? colors.primary : colors.textSecondary}
              />
              <Text
                variant="caption"
                color={canEdit ? "primary" : "textSecondary"}
              >
                Edit
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.modeTogglePlaceholder} />
        )}
      </View>

      {teams.length === 0 ? (
        <View style={styles.emptyTeamsNotice}>
          <Text variant="caption" color="textSecondary">
            No teams yet. Create one here to start assigning hexes.
          </Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={onCreateTeam}
              disabled={creatingTeam}
              activeOpacity={0.8}
              style={[styles.teamChip, styles.newTeamChip, creatingTeam ? styles.teamChipReadonly : null]}
            >
              <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
              <Text variant="caption" color="primary">
                {creatingTeam ? "Creating..." : "New Team"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.teamLegend}>
          {teams.map((teamSnapshot) => {
            const isActive = teamSnapshot.team.id === activeTeamId;
            return (
              <TouchableOpacity
                key={teamSnapshot.team.id}
                onPress={() => setActiveTeamId(teamSnapshot.team.id)}
                disabled={!canEdit}
                activeOpacity={0.8}
                style={[
                  styles.teamChip,
                  isActive ? styles.teamChipActive : null,
                  !canEdit ? styles.teamChipReadonly : null,
                ]}
              >
                <View
                  style={[styles.teamColorDot, { backgroundColor: teamSnapshot.team.color_hex }]}
                />
                <Text variant="caption" color="textPrimary">
                  {teamSnapshot.team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {canEdit ? (
            <TouchableOpacity
              onPress={onCreateTeam}
              disabled={creatingTeam}
              activeOpacity={0.8}
              style={[styles.teamChip, styles.newTeamChip, creatingTeam ? styles.teamChipReadonly : null]}
            >
              <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
              <Text variant="caption" color="primary">
                {creatingTeam ? "Creating..." : "New Team"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <UnsafeMapContainer
          ref={mapRef}
          center={initialCenterRef.current}
          zoom={zoom}
          zoomControl={false}
          style={styles.map as any}
        >
          <UnsafeTileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler enabled onMapClick={onMapClick} />
          {cellPolygons.map((polygon) => {
            const isActive = polygon.teamId === activeTeamId;
            return (
              <LeafletPolygon
                key={`${polygon.teamId}-${polygon.cell}`}
                positions={polygon.positions}
                pathOptions={{
                  color: polygon.colorHex,
                  weight: isActive ? 2.5 : 1.5,
                  fillColor: polygon.colorHex,
                  fillOpacity: isActive ? 0.5 : 0.35,
                }}
              />
            );
          })}
          {focusBoundary ? (
            <LeafletPolygon
              positions={focusBoundary}
              pathOptions={{
                color: colors.primary,
                weight: focusPulse ? 4 : 2.5,
                fillColor: colors.primary,
                fillOpacity: focusPulse ? 0.35 : 0.15,
                dashArray: focusPulse ? "6 4" : undefined,
              }}
            />
          ) : null}
        </UnsafeMapContainer>

        <View style={styles.mapOverlay}>
          <Text variant="caption" color="white">
            {canEdit
              ? savingMap
                ? "Saving cell changes..."
                : teams.length === 0
                  ? "Create a team first, then click map to assign cells"
                  : "Click map to assign/unassign cells"
              : "Click an assigned hex to share it in chat"}
          </Text>
        </View>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              const next = Math.min(19, zoom + 1);
              setZoom(next);
              mapRef.current?.setZoom(next);
            }}
          >
            <Text variant="h3">+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              const next = Math.max(3, zoom - 1);
              setZoom(next);
              mapRef.current?.setZoom(next);
            }}
          >
            <Text variant="h3">-</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 2,
    gap: 2,
  },
  modeToggleSegment: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeToggleSegmentActive: {
    backgroundColor: "#eef6ff",
  },
  modeTogglePlaceholder: {
    flex: 1,
  },
  teamLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  emptyTeamsNotice: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  teamChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  teamChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#eef6ff",
  },
  teamChipReadonly: {
    opacity: 0.8,
  },
  newTeamChip: {
    borderColor: colors.primary,
    backgroundColor: "#eef6ff",
  },
  teamColorDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  mapContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.md,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 500,
  },
  zoomControls: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    zIndex: 500,
    gap: spacing.xs,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
