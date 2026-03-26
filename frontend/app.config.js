const appJson = require("./app.json");

const baseExpoConfig = appJson.expo;

module.exports = () => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const backendApiUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL ?? "http://localhost:3000";
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return {
    ...baseExpoConfig,
    ios: {
      ...baseExpoConfig.ios,
      config: {
        ...(baseExpoConfig.ios?.config ?? {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...baseExpoConfig.android,
      config: {
        ...(baseExpoConfig.android?.config ?? {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    extra: {
      ...(baseExpoConfig.extra ?? {}),
      SUPABASE_URL: supabaseUrl,
      SUPABASE_ANON_KEY: supabaseAnonKey,
      BACKEND_API_URL: backendApiUrl,
      GOOGLE_MAPS_API_KEY: googleMapsApiKey,
    },
  };
};
