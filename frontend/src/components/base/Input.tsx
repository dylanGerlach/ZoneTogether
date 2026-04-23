/**
 * Reusable Input component with label and error states
 */

import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
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
          style={[
            styles.input,
            Boolean(error) && styles.inputError,
            rightIcon ? styles.inputWithIcon : null,
          ]}
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
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    minHeight: 50,
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
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
