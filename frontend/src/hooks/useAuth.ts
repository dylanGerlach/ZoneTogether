import { useState, useEffect, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../utils/supabase";
import * as authUtils from "../utils/auth";

interface UseAuthReturn {
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
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const sub = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: Record<string, unknown>
    ) => {
      const { user, session, error } = await authUtils.signUp(
        email,
        password,
        metadata
      );
      if (error) throw error;
      setUser(user);
      setSession(session);
    },
    []
  );

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const { user, session, error } = await authUtils.signIn(email, password);
    if (error) throw error;
    setUser(user);
    setSession(session);
  }, []);

  const handleSignOut = useCallback(async () => {
    const { error } = await authUtils.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  }, []);

  return {
    user,
    session,
    loading,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
