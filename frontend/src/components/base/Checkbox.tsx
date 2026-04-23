/**
 * Reusable Checkbox component
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radii, spacing } from '../../theme';

interface CheckboxProps {
  value: boolean;
  onToggle: (value: boolean) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  value,
  onToggle,
  children,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        if (disabled) return;
        onToggle(!value);
      }}
      activeOpacity={0.7}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={[styles.checkbox, value && styles.checked]}>
        {value && (
          <View style={styles.checkmark}>
            <Text variant="caption" color="white">
              ✓
            </Text>
          </View>
        )}
      </View>
      {children && (
        <View style={styles.label}>
          {typeof children === 'string' ? <Text variant="body">{children}</Text> : children}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    justifyContent: 'center',
  },
});
