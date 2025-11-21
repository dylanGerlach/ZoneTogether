/**
 * Signup screen - Register new users with full profile information
 */

import React, { useState } from "react";
import {
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, Button, Input, Checkbox } from "../components";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";
import { useAuthContext } from "../context/AuthContext";

type SignupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Signup"
>;

interface SignupErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
  terms?: string;
}

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const { signUp } = useAuthContext();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<"volunteer" | "organizer">("volunteer");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validation logic
  const validate = (): boolean => {
    const newErrors: SignupErrors = {};

    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@") || !email.includes(".")) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Phone number validation (optional, but if provided should be valid)
    if (phoneNumber && phoneNumber.trim().length < 10) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    // Terms acceptance validation
    if (!acceptedTerms) {
      newErrors.terms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    setFormError(null);
    setErrors({});
    try {
      await signUp(email, password, {
        fullName,
        phoneNumber: phoneNumber || undefined,
        role,
      });

      Alert.alert(
        "Success",
        "Account created! Please check your email to verify your account.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Signup failed. Please try again.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/Zone Together Logo 1.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text variant="h1" style={styles.title}>
                Sign Up
              </Text>
              <Text
                variant="body"
                color="textSecondary"
                style={styles.subtitle}
              >
                Create your ZoneTogether account
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {formError && (
                <Text variant="caption" color="error" style={styles.formError}>
                  {formError}
                </Text>
              )}

              {/* Full Name */}
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
                autoCapitalize="words"
                autoComplete="name"
              />

              {/* Email */}
              <Input
                label="Email Address"
                placeholder="hello@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              {/* Phone Number */}
              <Input
                label="Phone Number (optional)"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                error={errors.phoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
              />

              {/* Role Selection */}
              <View style={styles.roleContainer}>
                <Text
                  variant="label"
                  color="textPrimary"
                  style={styles.roleLabel}
                >
                  I am a
                </Text>
                <View style={styles.roleToggle}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === "volunteer" && styles.roleButtonActive,
                      styles.roleButtonFirst,
                    ]}
                    onPress={() => setRole("volunteer")}
                  >
                    <Text
                      variant="body"
                      color={role === "volunteer" ? "white" : "textPrimary"}
                    >
                      Volunteer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === "organizer" && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole("organizer")}
                  >
                    <Text
                      variant="body"
                      color={role === "organizer" ? "white" : "textPrimary"}
                    >
                      Organizer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password */}
              <Input
                label="Password"
                placeholder="********"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Text variant="body" color="textSecondary">
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </TouchableOpacity>
                }
              />

              {/* Confirm Password */}
              <Input
                label="Confirm Password"
                placeholder="********"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.7}
                  >
                    <Text variant="body" color="textSecondary">
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </TouchableOpacity>
                }
              />

              {/* Terms Checkbox */}
              <Checkbox value={acceptedTerms} onToggle={setAcceptedTerms}>
                <Text variant="body" color="textSecondary">
                  I agree to the{" "}
                  <Text variant="body" color="primary">
                    Terms and Conditions
                  </Text>
                </Text>
              </Checkbox>
              {errors.terms && (
                <Text variant="caption" color="error" style={styles.errorText}>
                  {errors.terms}
                </Text>
              )}

              {/* Submit Button */}
              <Button
                onPress={handleSignup}
                variant="primary"
                fullWidth
                loading={loading}
                style={styles.signupButton}
              >
                <Text variant="label" color="white">
                  Sign Up
                </Text>
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text variant="body" color="textSecondary">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.7}
              >
                <Text variant="body" color="primary">
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: spacing.lg,
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    width: 180,
    height: 180,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  formError: {
    marginBottom: spacing.sm,
  },
  roleContainer: {
    marginBottom: spacing.md,
  },
  roleLabel: {
    marginBottom: spacing.xs,
  },
  roleToggle: {
    flexDirection: "row",
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  roleButtonFirst: {
    marginRight: spacing.sm,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  signupButton: {
    marginTop: spacing.lg,
  },
  errorText: {
    marginLeft: spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
});
