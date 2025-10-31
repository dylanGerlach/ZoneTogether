import { useEffect, useState } from "react";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "./src/hooks/useAuth";
import Constants from "expo-constants";

export default function App() {
  const { user, session, loading, signOut } = useAuth();
  const [backendMessage, setBackendMessage] = useState<string>("Loading...");
  const [backendError, setBackendError] = useState<string>("");

  const extra = (Constants?.expoConfig?.extra ?? {}) as {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
  const hasSupabaseConfig = !!(extra.SUPABASE_URL && extra.SUPABASE_ANON_KEY);

  useEffect(() => {
    fetch("http://localhost:3000/")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setBackendMessage(text);
      })
      .catch((e) => setBackendError(e.message));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ZoneTogether</Text>
        <ActivityIndicator size="large" />
        <Text>Loading auth state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZoneTogether</Text>

      {/* Backend Connection Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Test:</Text>
        {backendError ? (
          <Text style={styles.error}>Error: {backendError}</Text>
        ) : (
          <Text style={styles.success}>{backendMessage}</Text>
        )}
      </View>

      {/* Supabase Configuration Check */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supabase Config:</Text>
        {hasSupabaseConfig ? (
          <Text style={styles.success}>✓ Configured</Text>
        ) : (
          <Text style={styles.warning}>
            ⚠ Not configured - Add credentials to app.json
          </Text>
        )}
      </View>

      {/* Auth State Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth State:</Text>
        {user ? (
          <>
            <Text style={styles.success}>✓ Authenticated</Text>
            <Text style={styles.info}>Email: {user.email}</Text>
            <Text style={styles.info}>User ID: {user.id}</Text>
            {session && <Text style={styles.info}>Session: Active</Text>}
          </>
        ) : (
          <Text style={styles.info}>Not authenticated</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  success: {
    color: "#28a745",
  },
  error: {
    color: "#dc3545",
  },
  warning: {
    color: "#ffc107",
  },
  info: {
    color: "#333",
    fontSize: 14,
  },
});
