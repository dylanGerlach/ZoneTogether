import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

let cachedClient: SupabaseClient | null = null;
let configurationWarningShown = false;
let configurationDebugLogged = false;

function maskValue(value: string): string {
  if (!value) return "(empty)";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getSupabaseConfig() {
  const env = process.env as Record<string, string | undefined>;
  const extra = (Constants?.expoConfig?.extra ?? {}) as {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };

  const supabaseUrl =
    env.EXPO_PUBLIC_SUPABASE_URL ?? extra.SUPABASE_URL ?? "";
  const supabaseAnonKey =
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.SUPABASE_ANON_KEY ?? "";

  return { supabaseUrl, supabaseAnonKey };
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!configurationDebugLogged) {
    configurationDebugLogged = true;
    console.log("[supabase] config detected", {
      url: supabaseUrl || "(empty)",
      anonKeyPreview: maskValue(supabaseAnonKey),
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!configurationWarningShown) {
      console.warn(
        "Supabase keys are not set. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or app.json extra)"
      );
      configurationWarningShown = true;
    }
    return null;
  }

  console.log("[supabase] creating client", {
    url: supabaseUrl,
    persistSession: true,
    autoRefreshToken: true,
  });
  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cachedClient;
}
