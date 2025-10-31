/**
 * Reusable Input component with label and error states
 */

import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  rightIcon,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color="textPrimary" style={styles.label}>
          {label}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, error && styles.inputError, rightIcon ? styles.inputWithIcon : null]}
          placeholderTextColor={colors.textTertiary}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {(error || helperText) && (
        <Text
          variant="caption"
          color={error ? 'error' : 'textSecondary'}
          style={styles.helperText}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  rightIcon: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  helperText: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
