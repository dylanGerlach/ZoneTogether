

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

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

const gradientColors = ["#5c2cff", "#2b7ef8"] as const;
const loginSocialOptions = [
  { id: "google", label: "Sign in with Google", icon: "google", variant: "light", library: "ant" },
  { id: "apple", label: "Sign in with Apple", icon: "apple", variant: "dark", library: "material" },
];

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const cardWidth = Math.min(Math.max(width - spacing.md * 2, 320), 520);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setFormError(null);
    setErrors({});
    try {
      await signIn(email, password);
      Alert.alert("Success", "Welcome back!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed. Please try again.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setKeepSignedIn(false);
    }, [])
  );

  const headerHeight = isMobile ? 170 : 200;
  const headerPadding = isMobile ? spacing.md : spacing.lg;
  const cardPadding = isMobile ? spacing.md : spacing.lg;
  const cardMarginTop = isMobile ? -25 : -45;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
                { width: cardWidth, padding: cardPadding, minHeight: isMobile ? 520 : 560 },
              ]}
            >
            <Image
              source={require("../../assets/Zone Together Logo 1.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text variant="h2" style={styles.cardTitle}>
              Welcome back
            </Text>
            <Text variant="body" color="textSecondary" style={styles.cardSubtitle}>
              Enter your credentials below
            </Text>

            <View style={styles.form}>
              {formError && (
                <Text variant="caption" color="error" style={styles.formError}>
                  {formError}
                </Text>
              )}
              <Text variant="label" style={styles.emailLabel}>
                Email Address
              </Text>
              <Input
                placeholder="hello@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
              />

            <View style={styles.passwordHeader}>
              <Text variant="label" style={styles.passwordLabel}>
                Password
              </Text>
              <TouchableOpacity onPress={() => Alert.alert("Reset password","We will send a reset link to your email.")} activeOpacity={0.7}>
                <Text variant="caption" color="primary">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>
              <Input
                placeholder="Password"
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

              <View style={styles.checkboxRow}>
                <Checkbox value={keepSignedIn} onToggle={setKeepSignedIn}>
                  <Text variant="body" color="textSecondary" style={styles.checkboxText}>
                    Keep me signed in
                  </Text>
                </Checkbox>
              </View>

              <Button
                onPress={handleLogin}
                variant="primary"
                fullWidth
                loading={loading}
                style={styles.loginButton}
              >
                <Text variant="label" color="white">
                  Sign In
                </Text>
              </Button>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text variant="caption" color="textSecondary" style={styles.dividerLabel}>
                  Or sign in with
                </Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                {loginSocialOptions.map(provider => {
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
            </View>

            <View style={styles.footer}>
              <Text variant="body" color="textSecondary">
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")} activeOpacity={0.7}>
                <Text variant="body" color="primary">
                  Create an account
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
    marginTop: -60,
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    paddingBottom: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: colors.gray500,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    textAlign: "center",
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  form: {
    width: "100%",
  },
  formError: {
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordLabel: {
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  
  emailLabel: {
    marginBottom: spacing.xs,
    fontWeight: "700",
  },
  checkboxRow: {
    marginTop: spacing.sm,
  },
  checkboxText: {
    lineHeight: typography.fontSize.md,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
});
