import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../utils/supabase";

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

  if (!supabaseEnabled) {
    throw new Error(
      "Supabase environment variables are not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your Expo environment."
    );
  }

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
