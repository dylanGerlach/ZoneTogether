import { getSupabaseClient } from "./supabase";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

function createConfigError(): AuthError {
  return {
    name: "AuthError",
    message: "Supabase not configured",
    status: 0,
  } as AuthError;
}

/**
 * Sign up a new user with email and password
 * Can include additional profile information in user metadata
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: {
    fullName?: string;
    phoneNumber?: string;
  }
): Promise<AuthResponse> {
  const client = getSupabaseClient();
  if (!client)
    return {
      user: null,
      session: null,
      error: createConfigError(),
    };
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {},
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const client = getSupabaseClient();
  if (!client)
    return {
      user: null,
      session: null,
      error: createConfigError(),
    };
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: null };
  const { error } = await client.auth.signOut();
  return { error };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const {
    data: { session },
  } = await client.auth.getSession();
  return session;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
