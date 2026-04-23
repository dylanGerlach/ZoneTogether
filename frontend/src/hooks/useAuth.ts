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
    let isMounted = true;
    console.log("[auth] bootstrap starting");
    // Prevent an indefinite splash spinner if auth bootstrap hangs.
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth bootstrap timed out; continuing without session.");
        setLoading(false);
      }
    }, 5000);

    const client = getSupabaseClient();
    if (!client) {
      console.warn("[auth] bootstrap aborted: no supabase client");
      setLoading(false);
      clearTimeout(loadingTimeout);
      return;
    }
    client.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        console.log("[auth] getSession resolved", {
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
        });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[auth] getSession failed", error);
        if (!isMounted) return;
        setLoading(false);
      })
      .finally(() => {
        clearTimeout(loadingTimeout);
      });

    // Listen for auth changes
    const sub = client.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      console.log("[auth] onAuthStateChange", {
        event: _event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
      });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
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
