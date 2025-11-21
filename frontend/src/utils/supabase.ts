import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

let cachedClient: SupabaseClient | null = null;
let configurationWarningShown = false;

function getSupabaseConfig() {
  const extra = (Constants?.expoConfig?.extra ?? {}) as {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.SUPABASE_URL ?? "";
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.SUPABASE_ANON_KEY ?? "";

  return { supabaseUrl, supabaseAnonKey };
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!configurationWarningShown) {
      console.warn(
        "Supabase keys are not set. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or app.json extra)"
      );
      configurationWarningShown = true;
    }
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cachedClient;
}
