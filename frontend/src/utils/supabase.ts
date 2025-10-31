import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const extra = (Constants?.expoConfig?.extra ?? {}) as {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };

  const supabaseUrl = extra.SUPABASE_URL ?? "";
  const supabaseAnonKey = extra.SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase keys are not set. Add SUPABASE_URL and SUPABASE_ANON_KEY to app.json -> extra"
    );
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
