import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { useAuthStore } from "@store/authStore";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setCollegeDomain = useAuthStore((state) => state.setCollegeDomain);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [collegeSubdomain, setCollegeSubdomain] = useState(""); // tenant prefix e.g. "mit" or empty for default
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!username) nextErrors.username = "Username or Email is required";
    if (!password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // 1. Resolve college domain if provided.
      // E.g., if subdomain is 'mit', resolve to 'mit.localhost:8000'
      // If it has a dot, use it directly. Otherwise append '.localhost:8000' (or production equivalent)
      let resolvedDomain: string | null = null;
      if (collegeSubdomain.trim()) {
        const subdomain = collegeSubdomain.trim().toLowerCase();
        if (subdomain.includes(".")) {
          resolvedDomain = subdomain;
        } else {
          resolvedDomain = `${subdomain}.localhost:8000`; // Local development multi-tenancy helper
        }
      }
      
      // Update store with domain so httpClient knows where to route
      setCollegeDomain(resolvedDomain);

      // 2. Submit login
      const response = await authApi.login({ username, password });
      
      // 3. Save to auth state
      await setAuth(response.user, response.access);

      Alert.alert("Success", `Welcome back, ${response.user.username}!`);
      
      // Route immediately to App space
      router.replace(ROUTES.APP.DASHBOARD);
    } catch (err: any) {
      console.error("Login failure", err);
      // Reset domain if login failed so it doesn't get stuck
      setCollegeDomain(null);
      
      Alert.alert("Login Failed", err.message || "Invalid credentials, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>CampusFlow</Text>
          <Text style={styles.subtitle}>Proxy-Proof Attendance Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <Input
            label="College Subdomain (Optional)"
            placeholder="e.g. mit, dy-patil"
            value={collegeSubdomain}
            onChangeText={setCollegeSubdomain}
          />

          <Input
            label="Username / Email"
            placeholder="Enter your username or email"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="Authenticate"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New Student? </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push(ROUTES.AUTH.REGISTER)}
            >
              Create Account
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    elevation: 8,
    shadowColor: COLORS.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },
  button: {
    marginTop: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
export default LoginScreen;
