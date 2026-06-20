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
  const setCollegeSchema = useAuthStore((state) => state.setCollegeSchema);

  const [username, setUsername] = useState("student1");
  const [password, setPassword] = useState("student1@mit.edu.in");
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
      // 1. Submit login to the central endpoint (or current resolved host)
      const response = await authApi.login({ username, password });
      console.log("Login response:", JSON.stringify(response, null, 2));
      
      // 2. Save resolved college domain & schema dynamically from response
      const resolvedDomain = response.tenant_domain || null;
      const resolvedSchema = response.tenant_schema || null;  // Backend now returns this directly
      await setCollegeDomain(resolvedDomain);
      await setCollegeSchema(resolvedSchema);

      // 3. Construct UserProfile and save to auth state
      const userProfile = {
        id: response.user_id,
        username: response.user || username,
        email: response.email || "",
        role: response.roleName || "student",
        student_profile: response.profile ? {
          student_id: response.profile.student_id || "",
          is_face_registered: response.profile.is_face_registered ?? false,
          locked_device_id: response.profile.locked_device_id ?? null,
        } : undefined
      };
      
      await setAuth(userProfile, response.access);

      Alert.alert("Success", `Welcome back, ${userProfile.username}!`);
      
      // Route immediately to App space
      router.replace(ROUTES.APP.DASHBOARD);
    } catch (err: any) {
      console.error("Login failure", err);
      // Reset domain/schema if login failed so it doesn't get stuck
      setCollegeDomain(null);
      setCollegeSchema(null);
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
    backgroundColor: COLORS.primary, // Aubergine background matching frontend login page
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
    fontSize: 38,
    fontWeight: "800",
    color: COLORS.white, // High contrast white heading
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.75)", // Soft translucent text
    marginTop: 6,
    fontWeight: "500",
  },
  card: {
    backgroundColor: COLORS.surface, // Clean white card in front of purple background
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
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
