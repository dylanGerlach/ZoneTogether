

import React, { useState, useCallback } from "react";
import {
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, Button, Input, Checkbox } from "../components";
import { colors, spacing, typography } from "../theme";
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
  terms?: string;
}

const gradientColors = ["#5c2cff", "#2b7ef8"] as const;
const socialOptions = [
  {
    id: "google",
    label: "Sign in with Google",
    icon: "google",
    variant: "light",
    library: "ant",
  },
  {
    id: "apple",
    label: "Sign in with Apple",
    icon: "apple",
    variant: "dark",
    library: "material",
  },
];

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const { signUp } = useAuthContext();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const cardWidth = Math.min(Math.max(width - spacing.md * 2, 320), 520);

  const validate = (): boolean => {
    const newErrors: SignupErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!email.includes("@") || !email.includes(".")) {
      newErrors.email = "Please enter a valid email";
    }
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords must match";
    if (!acceptedTerms)
      newErrors.terms = "You must accept the terms and conditions";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (value: string) => {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    if (score === 0) return { label: "Very weak", color: "#d32f2f", percentage: 0 };
    if (score === 1) return { label: "Weak", color: "#f57c00", percentage: 25 };
    if (score === 2) return { label: "Fair", color: "#fbc02d", percentage: 50 };
    if (score === 3) return { label: "Good", color: "#388e3c", percentage: 75 };
    return { label: "Strong", color: "#00796b", percentage: 100 };
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    setFormError(null);
    setErrors({});
    try {
    await signUp(email, password, {
      fullName,
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
        error instanceof Error ? error.message : "Signup failed. Please try again.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword;
  useFocusEffect(
    useCallback(() => {
      setAcceptedTerms(false);
    }, [])
  );

  const headerHeight = isMobile ? 170 : 200;
  const headerPadding = isMobile ? spacing.md : spacing.lg;
  const cardPadding = isMobile ? spacing.md : spacing.lg;
  const cardMarginTop = isMobile ? -35 : -55;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.gradientLayer}>
            <LinearGradient
              colors={gradientColors}
              style={[
                styles.gradientBackground,
                { height: headerHeight, paddingHorizontal: headerPadding },
              ]}
            >
              <Text variant="h2" style={styles.headerTitle}>
                ZoneTogether
              </Text>
            </LinearGradient>
          </View>

          <View style={[styles.cardWrapper, { marginTop: cardMarginTop }]}>
            <View
              style={[
                styles.card,
                { width: cardWidth, padding: cardPadding, minHeight: isMobile ? 520 : 580 },
              ]}
            >
            <Image
              source={require("../../assets/Zone Together Logo 1.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text variant="h2" style={styles.cardTitle}>
              Create account
            </Text>

            <View style={styles.form}>
              {formError && (
                <Text variant="caption" color="error" style={styles.formError}>
                  {formError}
                </Text>
              )}
              <View style={styles.inputStack}>
                <Input
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  error={errors.fullName}
                />
                <Input
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  keyboardType="email-address"
                />
                <Input
                  placeholder="Password"
                  helperText={password.length > 0 ? "Minimum 8 characters." : undefined}
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                  secureTextEntry={!showPassword}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Text variant="caption" color="textSecondary">
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </TouchableOpacity>
                  }
                />
                <Input
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Text variant="caption" color="textSecondary">
                        {showConfirmPassword ? "Hide" : "Show"}
                      </Text>
                    </TouchableOpacity>
                  }
                />
              </View>

              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBackground}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: `${passwordStrength.percentage}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="caption" color="textSecondary" style={styles.strengthLabel}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}

              <View style={styles.checkboxRow}>
                <Checkbox value={acceptedTerms} onToggle={setAcceptedTerms}>
                  <Text variant="body" color="textSecondary" style={styles.checkboxText}>
                    I agree to the{" "}
                    <Text variant="body" color="primary" style={styles.checkboxLinkText}>
                      Terms and Conditions
                    </Text>
                  </Text>
                </Checkbox>
              </View>
              {errors.terms && (
                <Text variant="caption" color="error" style={styles.errorText}>
                  {errors.terms}
                </Text>
              )}

              <Button onPress={handleSignup} variant="primary" fullWidth loading={loading}>
                <Text variant="label" color="white">
                  Sign Up
                </Text>
              </Button>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text variant="caption" color="textSecondary" style={styles.dividerLabel}>
                  Or sign up with
                </Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                {socialOptions.map(provider => {
                  const isDark = provider.variant === "dark";
                  const Icon =
                    provider.library === "material" ? MaterialCommunityIcons : AntDesign;
                  return (
                    <TouchableOpacity
                      key={provider.id}
                      style={[
                        styles.socialButton,
                        isDark ? styles.socialButtonDark : styles.socialButtonLight,
                      ]}
                    >
                      <Icon
                        name={provider.icon as any}
                        size={18}
                        color={isDark ? colors.white : colors.primary}
                        style={styles.socialIcon}
                      />
                      <Text
                        variant="body"
                        style={isDark ? styles.socialTextDark : styles.socialTextLight}
                      >
                        {provider.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                style={styles.footerLinkRow}
                activeOpacity={0.7}
              >
                <Text variant="body" color="textSecondary">
                  Already have an account?{" "}
                </Text>
                <Text variant="body" color="primary">
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e7edff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradientLayer: {
    width: "100%",
  },
  gradientBackground: {
    width: "100%",
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing.lg,
  },
  headerTitle: {
    color: colors.white,
    fontWeight: "700",
  },
  screen: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    flex: 1,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    backgroundColor: colors.white,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    shadowColor: colors.gray500,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    textAlign: "center",
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  form: {
    width: "100%",
    marginTop: spacing.sm,
  },
  formError: {
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
    color: colors.textSecondary,
    fontSize: 10,
  },
  helperText: {
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
  },
  strengthContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  strengthBarBackground: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.gray200,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  strengthLabel: {
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  matchText: {
    marginTop: spacing.xs,
  },
  checkboxRow: {
    marginTop: spacing.sm,
  },
  checkboxText: {
    lineHeight: typography.fontSize.md,
  },
  checkboxLinkText: {
    lineHeight: typography.fontSize.md,
  },
  errorText: {
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
  inputStack: {
    width: "100%",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerLabel: {
    marginHorizontal: spacing.sm,
  },
  socialRow: {
    width: "100%",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  socialButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  socialIcon: {
    marginRight: spacing.xs,
    fontWeight: "700",
  },
  socialButtonLight: {
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  socialButtonDark: {
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  socialTextLight: {
    color: colors.textPrimary,
  },
  socialTextDark: {
    color: colors.white,
  },
  footerLinkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
