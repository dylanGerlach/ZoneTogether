import type {
  User,
  Session,
  AuthError as SupabaseAuthError,
} from "@supabase/supabase-js";

export type AuthUser = User;
export type AuthSession = Session;
export type AuthError = SupabaseAuthError;

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends SignUpCredentials {
  fullName?: string;
  phoneNumber?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}
