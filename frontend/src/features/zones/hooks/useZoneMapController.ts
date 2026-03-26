import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";

import {
  adjustZone,
  deleteZone,
  fetchZones,
  postZone,
  updateZone,
  type ApiRequestError,
} from "../../../utils/backendApi";
import { useFreehandDraw } from "../providers/FreehandDraw";
import type { OverlapDetectedPayload, ZoneFeature, ZoneMode } from "../types";

type ZoneNameTakenPayload = {
  error: "zone_name_taken";
  existingZoneId: string;
  existingZoneName: string;
};

type AdjustErrorCode =
  | "adjust_missing_overlap_ids"
  | "adjust_overlap_zone_missing"
  | "adjust_geometry_invalid"
  | "adjust_inside_zone"
  | "adjust_overlap_processing_failed"
  | "adjust_too_small";

type AdjustErrorPayload = {
  error: string;
  code: AdjustErrorCode;
};

type UseZoneMapControllerArgs = {
  sessionToken: unknown;
  organizationId: string;
};

export type UseZoneMapControllerResult = {
  mode: ZoneMode;
  setMode: (mode: ZoneMode) => void;
  zoneName: string;
  setZoneName: (value: string) => void;
  selectedZoneToEditId: string | null;
  setSelectedZoneToEditId: (value: string | null) => void;
  zones: ZoneFeature[];
  loadingZones: boolean;
  saving: boolean;
  adjusting: boolean;
  overlapPayload: OverlapDetectedPayload | null;
  setOverlapPayload: (value: OverlapDetectedPayload | null) => void;
  mapHeightRatio: number;
  setMapHeightRatio: (value: number) => void;
  selectedZoneIds: string[];
  showZoneNameDropdown: boolean;
  setShowZoneNameDropdown: (value: boolean) => void;
  path: { latitude: number; longitude: number }[];
  setDrawing: (drawing: boolean) => void;
  appendCoordinate: (point: { latitude: number; longitude: number }) => void;
  clearPath: () => void;
  visibleZones: ZoneFeature[];
  existingZoneNameOptions: { id: string; name: string }[];
  getZoneKey: (zone: ZoneFeature, index: number) => string;
  getZoneLabel: (zone: ZoneFeature, index: number) => string;
  getZoneStyle: (
    zone: ZoneFeature,
    index: number,
  ) => {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
  toggleZoneVisibility: (zoneId: string) => void;
  clearZoneVisibilityFilters: () => void;
  loadZones: () => Promise<void>;
  handleSaveZone: () => Promise<void>;
  handleRedoZone: () => Promise<void>;
  handleDeleteZone: (zoneId: string, zoneLabel: string) => Promise<void>;
  dismissOverlap: () => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

function getOverlapPayload(error: unknown): OverlapDetectedPayload | null {
  const apiError = error as ApiRequestError | null;
  if (!apiError || apiError.status !== 409 || !apiError.body) return null;

  if (
    typeof apiError.body === "object" &&
    "error" in apiError.body &&
    apiError.body.error === "overlap_detected"
  ) {
    return apiError.body as OverlapDetectedPayload;
  }
  return null;
}

function getZoneNameTakenPayload(error: unknown): ZoneNameTakenPayload | null {
  const apiError = error as ApiRequestError | null;
  if (!apiError || apiError.status !== 409 || !apiError.body) return null;

  if (
    typeof apiError.body === "object" &&
    "error" in apiError.body &&
    apiError.body.error === "zone_name_taken" &&
    "existingZoneId" in apiError.body &&
    "existingZoneName" in apiError.body
  ) {
    return apiError.body as ZoneNameTakenPayload;
  }
  return null;
}

function getAdjustErrorPayload(error: unknown): AdjustErrorPayload | null {
  const apiError = error as ApiRequestError | null;
  if (!apiError || !apiError.body || apiError.status < 400) return null;

  if (
    typeof apiError.body === "object" &&
    "code" in apiError.body &&
    typeof apiError.body.code === "string" &&
    "error" in apiError.body &&
    typeof apiError.body.error === "string"
  ) {
    return apiError.body as AdjustErrorPayload;
  }
  return null;
}

function getAdjustFallbackMessage(payload: AdjustErrorPayload): string {
  switch (payload.code) {
    case "adjust_inside_zone":
      return "Your draft is fully inside another zone. Redraw a larger outline that surrounds open area.";
    case "adjust_too_small":
      return "The adjusted result became too small to save. Redraw with a slightly larger boundary.";
    case "adjust_geometry_invalid":
      return "That shape could not be auto-adjusted safely. Try redrawing with fewer sharp zig-zags.";
    case "adjust_overlap_processing_failed":
      return "Auto-adjust could not compute a stable result. Please redraw manually and try again.";
    case "adjust_overlap_zone_missing":
      return "An overlapping zone changed while you were editing. Refresh zones and try again.";
    case "adjust_missing_overlap_ids":
      return "We could not identify the overlapping zones. Redraw the zone and try again.";
    default:
      return payload.error;
  }
}

export function useZoneMapController({
  sessionToken,
  organizationId,
}: UseZoneMapControllerArgs): UseZoneMapControllerResult {
  const session = sessionToken as Parameters<typeof fetchZones>[0] | null;

  const [mode, setMode] = useState<ZoneMode>("view");
  const [zoneName, setZoneName] = useState("");
  const [selectedZoneToEditId, setSelectedZoneToEditId] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneFeature[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [overlapPayload, setOverlapPayload] = useState<OverlapDetectedPayload | null>(null);
  const [mapHeightRatio, setMapHeightRatio] = useState(0.62);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [showZoneNameDropdown, setShowZoneNameDropdown] = useState(false);
  const [pendingSaveZoneId, setPendingSaveZoneId] = useState<string | null>(null);

  const { path, clearPath, buildFeatureFromPath, appendCoordinate, setDrawing } = useFreehandDraw({
    enabled: mode === "freehand",
  });

  const getZoneKey = useCallback((zone: ZoneFeature, index: number) => {
    return String(zone.id ?? zone.properties?.name ?? `zone-${index}`);
  }, []);

  const getZoneLabel = useCallback((zone: ZoneFeature, index: number) => {
    const fallbackName = `Zone ${index + 1}`;
    return String(zone.properties?.name ?? zone.id ?? fallbackName);
  }, []);

  const getZoneId = useCallback((zone: ZoneFeature): string | null => {
    if (!zone.id) return null;
    return String(zone.id);
  }, []);

  const zoneColorPalette = useMemo(
    () => [
      { fillColor: "rgba(59,130,246,0.22)", strokeColor: "rgba(37,99,235,0.95)" },
      { fillColor: "rgba(16,185,129,0.22)", strokeColor: "rgba(5,150,105,0.95)" },
      { fillColor: "rgba(245,158,11,0.22)", strokeColor: "rgba(217,119,6,0.95)" },
      { fillColor: "rgba(236,72,153,0.2)", strokeColor: "rgba(219,39,119,0.95)" },
      { fillColor: "rgba(139,92,246,0.2)", strokeColor: "rgba(124,58,237,0.95)" },
      { fillColor: "rgba(14,165,233,0.22)", strokeColor: "rgba(2,132,199,0.95)" },
      { fillColor: "rgba(34,197,94,0.2)", strokeColor: "rgba(22,163,74,0.95)" },
      { fillColor: "rgba(244,63,94,0.2)", strokeColor: "rgba(225,29,72,0.95)" },
    ],
    [],
  );

  const getZoneStyle = useCallback(
    (zone: ZoneFeature, index: number) => {
      const key = getZoneKey(zone, index);
      let hash = 0;
      for (let i = 0; i < key.length; i += 1) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
      }
      const colorIndex = Math.abs(hash) % zoneColorPalette.length;
      return zoneColorPalette[colorIndex];
    },
    [getZoneKey, zoneColorPalette],
  );

  const visibleZones = useMemo(() => {
    if (selectedZoneIds.length === 0) return zones;
    return zones.filter((zone, index) => selectedZoneIds.includes(getZoneKey(zone, index)));
  }, [getZoneKey, selectedZoneIds, zones]);

  const existingZoneNameOptions = useMemo(() => {
    const uniqueByName = new Map<string, { id: string; name: string }>();
    for (let index = 0; index < zones.length; index += 1) {
      const zone = zones[index];
      const zoneId = getZoneId(zone);
      const zoneLabel = getZoneLabel(zone, index).trim();
      if (!zoneId || zoneLabel.length === 0) continue;
      const key = zoneLabel.toLowerCase();
      if (!uniqueByName.has(key)) {
        uniqueByName.set(key, { id: zoneId, name: zoneLabel });
      }
    }
    return Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [getZoneId, getZoneLabel, zones]);

  useEffect(() => {
    setSelectedZoneIds((previous) =>
      previous.filter((selectedId) =>
        zones.some((zone, index) => getZoneKey(zone, index) === selectedId),
      ),
    );
  }, [getZoneKey, zones]);

  useEffect(() => {
    if (!selectedZoneToEditId) return;
    const exists = zones.some((zone) => String(zone.id ?? "") === selectedZoneToEditId);
    if (!exists) {
      setSelectedZoneToEditId(null);
    }
  }, [selectedZoneToEditId, zones]);

  const toggleZoneVisibility = useCallback((zoneId: string) => {
    setSelectedZoneIds((previous) =>
      previous.includes(zoneId)
        ? previous.filter((id) => id !== zoneId)
        : [...previous, zoneId],
    );
  }, []);

  const clearZoneVisibilityFilters = useCallback(() => {
    setSelectedZoneIds([]);
  }, []);

  const loadZones = useCallback(async () => {
    if (!session) return;
    try {
      setLoadingZones(true);
      const featureCollection = await fetchZones(session, organizationId);
      setZones(featureCollection.features as ZoneFeature[]);
    } catch (error) {
      Alert.alert("Failed to load zones", getErrorMessage(error));
    } finally {
      setLoadingZones(false);
    }
  }, [organizationId, session]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const handleSaveZone = useCallback(async () => {
    if (!session) {
      Alert.alert("You need to be signed in to save zones.");
      return;
    }

    const normalizedName = zoneName.trim();
    if (normalizedName.length === 0) {
      Alert.alert("Zone name required", "Enter a unique zone name before saving.");
      return;
    }

    const matchedOption =
      existingZoneNameOptions.find((option) => option.name.toLowerCase() === normalizedName.toLowerCase()) ??
      null;
    const zoneIdForSave = selectedZoneToEditId ?? matchedOption?.id ?? null;
    const builtFeature = buildFeatureFromPath(normalizedName);
    if (!builtFeature) {
      Alert.alert("Not enough points", "Draw at least 3 points before saving a zone.");
      return;
    }

    try {
      setSaving(true);
      if (zoneIdForSave) {
        await updateZone(session, organizationId, zoneIdForSave, builtFeature as any);
      } else {
        await postZone(session, organizationId, builtFeature as any);
      }
      clearPath();
      setOverlapPayload(null);
      setPendingSaveZoneId(null);
      setSelectedZoneToEditId(zoneIdForSave);
      Alert.alert(zoneIdForSave ? "Zone updated" : "Zone saved");
      await loadZones();
    } catch (error) {
      const overlap = getOverlapPayload(error);
      if (overlap) {
        setPendingSaveZoneId(zoneIdForSave);
        setOverlapPayload(overlap);
        return;
      }
      const zoneNameTaken = getZoneNameTakenPayload(error);
      if (zoneNameTaken) {
        Alert.alert(
          "Zone name already exists",
          `"${zoneNameTaken.existingZoneName}" already exists. Select it from the dropdown to edit that zone, or choose a new unique name.`,
        );
        return;
      }
      Alert.alert("Could not save zone", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [
    buildFeatureFromPath,
    clearPath,
    existingZoneNameOptions,
    loadZones,
    organizationId,
    selectedZoneToEditId,
    session,
    zoneName,
  ]);

  const getOverlapIds = useCallback((payload: OverlapDetectedPayload): string[] => {
    const fromList =
      payload.overlappingZones?.map((zone) => String(zone.id ?? "")).filter((id) => id.length > 0) ?? [];
    if (fromList.length > 0) return fromList;
    if (payload.overlappingZone?.id) return [String(payload.overlappingZone.id)];
    return [];
  }, []);

  const handleRedoZone = useCallback(async () => {
    if (adjusting || !session || !overlapPayload) return;

    const currentPayload = overlapPayload;
    let overlapIds = getOverlapIds(currentPayload);
    if (overlapIds.length === 0) {
      Alert.alert("Missing overlap ids", "Could not identify overlapping zones.");
      return;
    }

    try {
      setAdjusting(true);

      let workingZone = currentPayload.newZone;
      let saved = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const adjusted = await adjustZone(session, organizationId, workingZone as any, overlapIds);
        workingZone = adjusted.adjustedZone as ZoneFeature;
        try {
          if (pendingSaveZoneId) {
            await updateZone(session, organizationId, pendingSaveZoneId, workingZone as any);
          } else {
            await postZone(session, organizationId, workingZone as any);
          }
          saved = true;
          break;
        } catch (postError) {
          const nextOverlap = getOverlapPayload(postError);
          if (!nextOverlap) throw postError;
          overlapIds = getOverlapIds(nextOverlap);
          if (overlapIds.length === 0) {
            setOverlapPayload(nextOverlap);
            throw postError;
          }
        }
      }

      if (!saved) {
        Alert.alert(
          "Could not auto-adjust all overlaps",
          "Please redraw manually and try again with a cleaner boundary.",
        );
        return;
      }

      Alert.alert("Zone adjusted and saved");
      setPendingSaveZoneId(null);
      setOverlapPayload(null);
      clearPath();
      await loadZones();
    } catch (error) {
      // Keep overlap context available for retry/redraw when auto-adjust fails.
      setOverlapPayload((previous) => previous ?? currentPayload);
      const adjustError = getAdjustErrorPayload(error);
      if (adjustError) {
        Alert.alert("Redo Zone could not auto-adjust", getAdjustFallbackMessage(adjustError));
        return;
      }
      Alert.alert("Redo Zone failed", getErrorMessage(error));
    } finally {
      setAdjusting(false);
    }
  }, [adjusting, clearPath, getOverlapIds, loadZones, organizationId, overlapPayload, pendingSaveZoneId, session]);

  const handleDeleteZone = useCallback(
    async (zoneId: string, zoneLabel: string) => {
      if (!session) return;

      if (Platform.OS === "web") {
        const shouldDelete =
          typeof window !== "undefined" ? window.confirm(`Delete "${zoneLabel}"?`) : true;
        if (!shouldDelete) return;

        try {
          await deleteZone(session, organizationId, zoneId);
          await loadZones();
        } catch (error) {
          Alert.alert("Delete failed", getErrorMessage(error));
        }
        return;
      }

      await new Promise<void>((resolve) => {
        Alert.alert("Delete zone", `Delete "${zoneLabel}"?`, [
          { text: "Cancel", style: "cancel", onPress: () => resolve() },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await deleteZone(session, organizationId, zoneId);
                  await loadZones();
                } catch (error) {
                  Alert.alert("Delete failed", getErrorMessage(error));
                } finally {
                  resolve();
                }
              })();
            },
          },
        ]);
      });
    },
    [loadZones, organizationId, session],
  );

  const dismissOverlap = useCallback(() => {
    setOverlapPayload(null);
    setPendingSaveZoneId(null);
  }, []);

  return {
    mode,
    setMode,
    zoneName,
    setZoneName,
    selectedZoneToEditId,
    setSelectedZoneToEditId,
    zones,
    loadingZones,
    saving,
    adjusting,
    overlapPayload,
    setOverlapPayload,
    mapHeightRatio,
    setMapHeightRatio,
    selectedZoneIds,
    showZoneNameDropdown,
    setShowZoneNameDropdown,
    path,
    setDrawing,
    appendCoordinate,
    clearPath,
    visibleZones,
    existingZoneNameOptions,
    getZoneKey,
    getZoneLabel,
    getZoneStyle,
    toggleZoneVisibility,
    clearZoneVisibilityFilters,
    loadZones,
    handleSaveZone,
    handleRedoZone,
    handleDeleteZone,
    dismissOverlap,
  };
}
