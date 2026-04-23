import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Constants from "expo-constants";

import { Button, Card, ScreenScaffold, SliderControl, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { ModeToggle } from "../features/zones/components/ModeToggle";
import { OverlapPopup } from "../features/zones/components/OverlapPopup";
import { ZoneMapCanvas } from "../features/zones/components/ZoneMapCanvas";
import { useZoneMapController } from "../features/zones/hooks/useZoneMapController";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";
import type { ZoneMapRegion } from "../features/zones/types/map-adapter";

type ZoneMapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "ZoneMap">;
type ZoneMapScreenRouteProp = RouteProp<RootStackParamList, "ZoneMap">;

export const ZoneMapScreen: React.FC = () => {
  const navigation = useNavigation<ZoneMapScreenNavigationProp>();
  const route = useRoute<ZoneMapScreenRouteProp>();
  const { organizationId, organizationName } = route.params;
  const { session } = useAuthContext();
  const { height: windowHeight } = useWindowDimensions();
  const [deleteTargetZone, setDeleteTargetZone] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [deletingZone, setDeletingZone] = useState(false);

  const {
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
    handleSaveZone,
    handleRedoZone,
    handleDeleteZone,
    dismissOverlap,
  } = useZoneMapController({
    sessionToken: session,
    organizationId,
  });

  const isExpoGo = Constants.appOwnership === "expo";
  const requiresIosDevBuild = Platform.OS === "ios" && isExpoGo;
  const env = process.env as Record<string, string | undefined>;
  const extra = (Constants?.expoConfig?.extra ?? {}) as { GOOGLE_MAPS_API_KEY?: string };
  const googleMapsApiKey =
    env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? extra.GOOGLE_MAPS_API_KEY ?? "";
  const missingNativeGoogleMapsKey =
    Platform.OS !== "web" && googleMapsApiKey.trim().length === 0;
  const mapUnavailableReason = requiresIosDevBuild
    ? "ios-dev-build-required"
    : missingNativeGoogleMapsKey
      ? "google-maps-key-missing"
      : null;
  const computedMapHeight = Math.max(420, Math.round(windowHeight * mapHeightRatio));
  const closeDeleteZoneModal = () => {
    if (deletingZone) return;
    setDeleteTargetZone(null);
  };

  const handleConfirmDeleteZone = async () => {
    if (!deleteTargetZone) return;
    setDeletingZone(true);
    try {
      await handleDeleteZone(deleteTargetZone.id);
      setDeleteTargetZone(null);
    } finally {
      setDeletingZone(false);
    }
  };

  const initialRegion = useMemo<ZoneMapRegion>(
    () => ({
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [],
  );

  return (
    <ScreenScaffold
      title={`${organizationName} Zones`}
      subtitle="Draw and manage cleanup zones"
      scroll={false}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back",
        onPress: () => navigation.goBack(),
      }}
    >
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text variant="caption" color="textSecondary">
            Blue: saved zones. Red: draft.
          </Text>

          <Card style={styles.controlsCard}>
            <ModeToggle mode={mode} onModeChange={setMode} />
            <Text variant="caption" color="textSecondary">
              {mode === "freehand" ? "Draw mode: drag or tap to add points." : "View mode: pan and zoom."}
            </Text>
            <SliderControl
              label="Map size"
              value={mapHeightRatio}
              minimumValue={0.52}
              maximumValue={0.82}
              step={0.02}
              valueText={`${Math.round(mapHeightRatio * 100)}%`}
              onValueChange={setMapHeightRatio}
            />
            <View style={styles.zoneNameRow}>
              <Text variant="label" color="textSecondary">
                Zone name
              </Text>
              <TextInput
                value={zoneName}
                onChangeText={(value) => {
                  setZoneName(value);
                  setShowZoneNameDropdown(true);
                  const selectedOption = existingZoneNameOptions.find((option) => option.id === selectedZoneToEditId);
                  if (selectedOption && selectedOption.name.toLowerCase() !== value.trim().toLowerCase()) {
                    setSelectedZoneToEditId(null);
                  }
                }}
                onFocus={() => setShowZoneNameDropdown(true)}
                placeholder="Type zone name"
                placeholderTextColor={colors.textTertiary}
                style={styles.zoneNameInput}
              />
              {showZoneNameDropdown ? (
                <View style={styles.zoneNameDropdown}>
                  <TouchableOpacity
                    style={styles.zoneNameOption}
                    onPress={() => {
                      setZoneName("");
                      setSelectedZoneToEditId(null);
                      setShowZoneNameDropdown(false);
                    }}
                  >
                    <Text variant="caption" color="primary">
                      + Create new zone name
                    </Text>
                  </TouchableOpacity>
                  {existingZoneNameOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.zoneNameOption}
                      onPress={() => {
                        setZoneName(option.name);
                        setSelectedZoneToEditId(option.id);
                        setShowZoneNameDropdown(false);
                      }}
                    >
                      <Text variant="caption">{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <Text variant="caption" color="textSecondary">
                {selectedZoneToEditId
                  ? "Editing selected zone (saving will update it)."
                  : "Type a new unique name to create a new zone."}
              </Text>
            </View>
            <View style={styles.actionsRow}>
              <Button variant="outline" onPress={clearPath}>
                <Text variant="label" color="primary">
                  Clear Draft
                </Text>
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleSaveZone()}
                loading={saving}
                disabled={mode !== "freehand" || path.length < 3}
              >
                <Text variant="label" color="white">
                  {selectedZoneToEditId ? "Update Zone" : "Save Zone"}
                </Text>
              </Button>
            </View>
          </Card>

          {mapUnavailableReason ? (
            <Card style={styles.webCard}>
              {mapUnavailableReason === "ios-dev-build-required" ? (
                <>
                  <Text variant="h3">Google Maps requires iOS dev build</Text>
                  <Text variant="body" color="textSecondary">
                    This project is configured to use Google Maps on iOS. Expo Go does not include the required
                    native Google Maps module. Run the app with a custom iOS development build to use zoning on iOS.
                  </Text>
                </>
              ) : (
                <>
                  <Text variant="h3">Google Maps key missing</Text>
                  <Text variant="body" color="textSecondary">
                    Map rendering is unavailable because no Google Maps API key is configured for this build.
                    Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (or set `GOOGLE_MAPS_API_KEY` in app config extra),
                    then restart the app.
                  </Text>
                  <Text variant="body" color="textSecondary">
                    You can still review saved zones and manage zone metadata below.
                  </Text>
                </>
              )}
            </Card>
          ) : (
            <ZoneMapCanvas
              mode={mode}
              path={path}
              visibleZones={visibleZones}
              mapHeight={computedMapHeight}
              initialRegion={initialRegion}
              getZoneStyle={getZoneStyle}
              onAppendCoordinate={appendCoordinate}
              onSetDrawing={setDrawing}
            />
          )}

          {loadingZones ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="caption" color="textSecondary">
                Refreshing zones...
              </Text>
            </View>
          ) : null}

          <Card style={styles.zonePickerCard}>
            <View style={styles.zonePickerHeader}>
              <Text variant="label">Zones</Text>
              <Button
                variant="outline"
                onPress={clearZoneVisibilityFilters}
                disabled={selectedZoneIds.length === 0}
              >
                <Text variant="caption" color="primary">
                  Show All Zones
                </Text>
              </Button>
            </View>
            <Text variant="caption" color="textSecondary">
              Toggle visibility, select multiple zones, or delete unused ones.
            </Text>
            <View style={styles.zoneTable}>
              {zones.length === 0 ? (
                <Text variant="caption" color="textSecondary">
                  No zones saved yet.
                </Text>
              ) : (
                zones.map((zone, index) => {
                  const zoneId = getZoneKey(zone, index);
                  const isSelected = selectedZoneIds.includes(zoneId);
                  const colorStyle = getZoneStyle(zone, index);
                  const showAsActive = selectedZoneIds.length === 0 || isSelected;

                  return (
                    <View key={zoneId} style={[styles.zoneRow, showAsActive ? styles.zoneChipActive : null]}>
                      <View style={[styles.zoneColorDot, { backgroundColor: colorStyle.strokeColor }]} />
                      <TouchableOpacity
                        onPress={() => toggleZoneVisibility(zoneId)}
                        style={styles.zoneRowName}
                        activeOpacity={0.8}
                      >
                        <Text variant="caption" color={showAsActive ? "textPrimary" : "textSecondary"}>
                          {getZoneLabel(zone, index)}
                        </Text>
                      </TouchableOpacity>
                      <Button
                        variant="outline"
                        onPress={() => {
                          setDeleteTargetZone({
                            id: zoneId,
                            label: getZoneLabel(zone, index),
                          });
                        }}
                      >
                        <Text variant="caption" color="error">
                          Delete
                        </Text>
                      </Button>
                    </View>
                  );
                })
              )}
            </View>
          </Card>
        </ScrollView>
      </View>

      <OverlapPopup
        visible={Boolean(overlapPayload)}
        overlappingZone={overlapPayload?.overlappingZone ?? null}
        overlapCount={overlapPayload?.overlappingZones?.length ?? (overlapPayload ? 1 : 0)}
        onRedo={() => void handleRedoZone()}
        onRedrawManually={() => {
          dismissOverlap();
          clearPath();
        }}
        loading={adjusting}
      />

      <Modal
        visible={deleteTargetZone !== null}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteZoneModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeDeleteZoneModal} />
          <View style={styles.modalCard}>
            <Text variant="h3">Delete zone</Text>
            <Text variant="body" color="textSecondary">
              Delete "{deleteTargetZone?.label ?? "this zone"}"?
            </Text>
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={closeDeleteZoneModal}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => void handleConfirmDeleteZone()}
                loading={deletingZone}
              >
                <Text variant="label" color="error">
                  Delete
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingTop: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  controlsCard: {
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  zoneNameRow: {
    gap: spacing.xs,
  },
  zoneNameInput: {
    backgroundColor: "#f7f8ff",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  zoneNameDropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  zoneNameOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  webCard: {
    borderRadius: 16,
    padding: spacing.lg,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  zonePickerCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  zonePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneTable: {
    gap: spacing.xs,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  zoneRowName: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  zoneChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#eef6ff",
  },
  zoneColorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
