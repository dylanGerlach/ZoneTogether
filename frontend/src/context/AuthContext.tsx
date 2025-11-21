import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { View, StyleSheet } from "react-native";
import type { Session, User } from "@supabase/supabase-js";

import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../utils/supabase";
import { colors, spacing } from "../theme";
import { Text } from "../components";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const supabaseEnabled = isSupabaseConfigured();

  const authState = useAuth();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: authState.user,
      session: authState.session,
      loading: authState.loading,
      signUp: authState.signUp,
      signIn: authState.signIn,
      signOut: authState.signOut,
    }),
    [authState]
  );

  if (!supabaseEnabled) {
    return (
      <AuthContext.Provider value={value}>
        <MissingSupabaseConfigNotice />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const MissingSupabaseConfigNotice: React.FC = () => (
  <View style={styles.noticeContainer}>
    <Text variant="h2" align="center" style={styles.noticeTitle}>
      Supabase configuration missing
    </Text>
    <Text variant="body" align="center" style={styles.noticeBody}>
      Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or add
      them to `app.json` extra) so authentication can run.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  noticeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  noticeTitle: {
    marginBottom: spacing.sm,
  },
  noticeBody: {
    color: colors.textSecondary,
  },
});

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
