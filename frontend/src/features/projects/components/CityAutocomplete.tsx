import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Text } from "../../../components/base/Text";
import { colors, radii, spacing, typography } from "../../../theme";
import type { AuthSession, GeocodeResult } from "../../../types";
import { geocodeCity } from "../../../utils/backendApi";

export interface CityAutocompleteSelection {
  city: string;
  label: string;
  lat: number;
  lng: number;
}

interface CityAutocompleteProps {
  session: AuthSession | null;
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (selection: CityAutocompleteSelection | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  error?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  session,
  value,
  onChangeText,
  onSelect,
  placeholder = "Search for a city...",
  autoFocus,
  error,
  disabled,
}) => {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [queryAttempted, setQueryAttempted] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFetchRef = useRef(false);

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);

  useEffect(() => {
    if (suppressFetchRef.current) {
      suppressFetchRef.current = false;
      return;
    }

    cancelInFlight();

    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setFetchError(null);
      setQueryAttempted(false);
      return;
    }
    if (!session) return;

    setLoading(true);
    setFetchError(null);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setQueryAttempted(true);
      geocodeCity(session, trimmed, { signal: controller.signal })
        .then((results) => {
          if (controller.signal.aborted) return;
          setSuggestions(results);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "Couldn't load cities";
          setFetchError(message);
          setSuggestions([]);
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);
  }, [value, session, cancelInFlight]);

  const handleSelect = (result: GeocodeResult) => {
    suppressFetchRef.current = true;
    cancelInFlight();
    setHasSelection(true);
    setSuggestions([]);
    setLoading(false);
    setFetchError(null);
    onChangeText(result.city);
    onSelect({
      city: result.city,
      label: result.label,
      lat: result.lat,
      lng: result.lng,
    });
  };

  const handleChangeText = (nextValue: string) => {
    if (hasSelection) {
      setHasSelection(false);
      onSelect(null);
    }
    onChangeText(nextValue);
  };

  const showDropdown =
    isFocused && !hasSelection && value.trim().length >= MIN_QUERY_LENGTH;

  return (
    <View style={styles.container}>
      <Text variant="label" color="textPrimary" style={styles.label}>
        City
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            Boolean(error) && styles.inputError,
            hasSelection && styles.inputSelected,
          ]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoFocus={autoFocus}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          // Delay blur to allow dropdown taps to register first.
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading ? (
          <View style={styles.rightIcon}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
        {showDropdown ? (
          <View style={styles.dropdown}>
            {fetchError ? (
              <Text variant="caption" color="error" style={styles.dropdownMessage}>
                {fetchError}
              </Text>
            ) : loading ? (
              <Text variant="caption" color="textSecondary" style={styles.dropdownMessage}>
                Searching...
              </Text>
            ) : suggestions.length === 0 && queryAttempted ? (
              <Text variant="caption" color="textSecondary" style={styles.dropdownMessage}>
                No matching cities. Try a different spelling.
              </Text>
            ) : (
              suggestions.map((result, index) => (
                <Pressable
                  key={`${result.lat}-${result.lng}-${index}`}
                  onPress={() => handleSelect(result)}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    index < suggestions.length - 1 && styles.dropdownItemDivider,
                    pressed && styles.dropdownItemPressed,
                  ]}
                >
                  <Text variant="body" style={styles.dropdownCity}>
                    {result.city}
                  </Text>
                  <Text
                    variant="caption"
                    color="textSecondary"
                    numberOfLines={1}
                  >
                    {result.label}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="error" style={styles.helperText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    // Give the dropdown room to stack above sibling form elements on web.
    zIndex: 10,
    ...(Platform.OS === "web" ? ({ position: "relative" } as object) : {}),
  },
  label: {
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    paddingRight: 40,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputSelected: {
    borderColor: colors.primary,
  },
  rightIcon: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.gray900,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    overflow: "hidden",
    zIndex: 20,
  },
  dropdownMessage: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  dropdownItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemPressed: {
    backgroundColor: colors.actionSecondary,
  },
  dropdownCity: {
    fontWeight: "600",
  },
  helperText: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
