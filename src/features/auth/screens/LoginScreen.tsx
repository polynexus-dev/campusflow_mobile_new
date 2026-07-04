import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@store/authStore";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";
import { Feather } from "@expo/vector-icons";

interface CustomInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: keyof typeof Feather.glyphMap;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secureTextEntry = false,
  error,
  autoCapitalize = "none",
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputContainerError : null,
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={COLORS.primary}
          style={styles.inputLeftIcon}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          autoCapitalize={autoCapitalize}
          style={styles.textInput}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
            style={styles.inputRightIcon}
          >
            <Feather
              name={isSecure ? "eye-off" : "eye"}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
};

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setCollegeDomain = useAuthStore((state) => state.setCollegeDomain);
  const setCollegeSchema = useAuthStore((state) => state.setCollegeSchema);

  const [username, setUsername] = useState("demo_student");
  const [password, setPassword] = useState("Password123");
  const [rememberMe, setRememberMe] = useState(false);
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      {/* Ambient background glow elements for a premium layout feel */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../../assets/campus_nexus_icon.png")}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.title}>
            Campus<Text style={styles.titleHighlight}>Nexus</Text>
          </Text>
          <Text style={styles.subtitle}>Proxy-Proof Attendance Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardGreeting}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to access your dashboard</Text>

          <CustomInput
            label="Username / Email"
            placeholder="Enter your username or email"
            value={username}
            onChangeText={setUsername}
            icon="user"
            error={errors.username}
          />

          <CustomInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            icon="lock"
            secureTextEntry
            error={errors.password}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Feather name="check" size={10} color={COLORS.white} />}
              </View>
              <Text style={styles.rememberMeText}>Remember Me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => Alert.alert("Forgot Password", "Please contact your college administrator to reset your password.")} 
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

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
    backgroundColor: COLORS.primary, // Aubergine brand background
    position: "relative",
  },
  glowTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: COLORS.secondary,
    opacity: 0.15,
    zIndex: -1,
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.accent,
    opacity: 0.18,
    zIndex: -1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 64 : 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  logoImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 1.2,
  },
  titleHighlight: {
    color: "#E8C8FF", // Bright lilac shade for dynamic accent
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 6,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  cardGreeting: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 18,
    width: "100%",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputContainer: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainerFocused: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  inputContainerError: {
    borderColor: COLORS.error,
  },
  inputLeftIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: "100%",
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
  },
  inputRightIcon: {
    paddingVertical: 10,
    paddingLeft: 10,
  },
  inputErrorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  rememberMeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  forgotPasswordText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: "700",
  },
  button: {
    marginTop: 8,
    borderRadius: 14,
    height: 54,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LoginScreen;
