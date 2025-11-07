/**
 * Login screen
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

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

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
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
                Login
              </Text>
              <Text
                variant="body"
                color="textSecondary"
                style={styles.subtitle}
              >
                Welcome back to the app
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {formError && (
                <Text variant="caption" color="error" style={styles.formError}>
                  {formError}
                </Text>
              )}

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

              <View style={styles.passwordHeader}>
                <Text variant="label" color="textPrimary">
                  Password
                </Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text variant="label" color="primary">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
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

              <Checkbox value={keepSignedIn} onToggle={setKeepSignedIn}>
                Keep me signed in
              </Checkbox>

              <Button
                onPress={handleLogin}
                variant="primary"
                fullWidth
                loading={loading}
                style={styles.loginButton}
              >
                <Text variant="label" color="white">
                  Login
                </Text>
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text variant="body" color="textSecondary">
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Signup")}
                activeOpacity={0.7}
              >
                <Text variant="body" color="primary">
                  Create an account
                </Text>
              </TouchableOpacity>
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
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
});
