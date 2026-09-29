import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Image, Modal } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@store/authStore";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";
import { Feather } from "@expo/vector-icons";
import { hasBusConductorAccess } from "@/utils/busAccess";

interface CustomInputProps {
  label?: string;
  rightLabel?: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: keyof typeof Feather.glyphMap;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  rightLabel,
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
      {(label || rightLabel) && (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.inputLabel}>{label}</Text> : <View />}
          {rightLabel}
        </View>
      )}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputContainerError : null,
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={COLORS.primary}
            style={styles.inputLeftIcon}
          />
        )}
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
              name={isSecure ? "eye" : "eye-off"}
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

  // Onboarding & Recovery States
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

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
        first_name: response.first_name || "",
        last_name: response.last_name || "",
        role: response.roleName || "student",
        consent_given: response.consent_given ?? true,
        tenant_name: response.tenant?.name || "your institution",
        tenant_logo: response.tenant?.logo || null,
        is_bus_driver: response.is_bus_driver ?? false,
        is_bus_conductor: response.is_bus_conductor ?? false,
        bus_route_id: response.bus_route_id ?? null,
        student_profile: response.profile ? {
          student_id: response.profile.student_id || "",
          is_face_registered: response.profile.is_face_registered ?? false,
          locked_device_id: response.profile.locked_device_id ?? null,
        } : undefined
      };

      await setAuth(userProfile, response.access, response.refresh);

      Alert.alert("Success", `Welcome back, ${userProfile.username}!`);

      // Bus driver/conductor accounts get their own trimmed 3-tab Home /
      // Passengers / Profile experience instead of the student tabs — same
      // gate app/index.tsx and app/_layout.tsx use, since this redirect
      // fires before either of those ever gets a chance to run.
      if (userProfile.role === "guardian") {
        router.replace(ROUTES.APP.GUARDIAN_HOME);
      } else if (hasBusConductorAccess(userProfile)) {
        router.replace(ROUTES.APP.DRIVER_DASHBOARD);
      } else {
        router.replace(ROUTES.APP.DASHBOARD);
      }
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
      <StatusBar style="dark" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrapper}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../../assets/campus_nexus_icon.png")}
              style={styles.logoImage}
            />
          </View>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to CampusFlow with your college account.</Text>

        <View style={styles.formContainer}>
          <CustomInput
            key="login-username"
            label="College email"
            placeholder="ananya.rao@nexuscollege.edu"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
            autoCapitalize="none"
          />

          <CustomInput
            key="login-password"
            label="Password"
            rightLabel={
              <TouchableOpacity
                onPress={() => {
                  setShowForgot(true);
                  setForgotStep(1);
                  setForgotEmail("");
                  setForgotOtp("");
                  setForgotToken("");
                  setForgotPassword("");
                  setForgotConfirm("");
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot?</Text>
              </TouchableOpacity>
            }
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="Sign in"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Sign in with OTP instead"
            variant="outline"
            onPress={() => router.push(ROUTES.AUTH.OTP)}
            style={styles.otpButton}
            textStyle={styles.otpButtonText}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New to CampusFlow?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push(ROUTES.AUTH.REGISTER)}
            >
              Register
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Forgot Password Modal (DPDP Compliance & Recovery) */}
      <Modal
        visible={showForgot}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForgot(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setShowForgot(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {forgotStep === 1 && (
                <View>
                  <Text style={styles.modalDescription}>
                    Enter your registered college email. We will send you a 6-digit verification code.
                  </Text>
                  <CustomInput
                    key="forgot-email"
                    label="College Email Address"
                    placeholder="student@college.edu"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    icon="mail"
                  />
                  <Button
                    title="Send Verification Code"
                    onPress={async () => {
                      if (!forgotEmail) {
                        Alert.alert("Error", "Please enter your college email address.");
                        return;
                      }
                      setForgotLoading(true);
                      try {
                        const response = await authApi.forgotPasswordRequestOTP({ email: forgotEmail });
                        Alert.alert("Code Sent", response.message || "OTP has been sent to your email.");
                        setForgotStep(2);
                      } catch (err: any) {
                        Alert.alert("Failed", err.message || "Error generating recovery code.");
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    loading={forgotLoading}
                    style={styles.modalButton}
                  />
                </View>
              )}

              {forgotStep === 2 && (
                <View>
                  <Text style={styles.modalDescription}>
                    Enter the 6-digit OTP code sent to your email to verify your identity:
                  </Text>
                  <CustomInput
                    key="forgot-otp"
                    label="6-Digit Code"
                    placeholder="123456"
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    icon="shield"
                    autoCapitalize="none"
                  />
                  <Button
                    title="Verify Verification Code"
                    onPress={async () => {
                      if (!forgotOtp) {
                        Alert.alert("Error", "Please enter the verification code.");
                        return;
                      }
                      setForgotLoading(true);
                      try {
                        const response = await authApi.forgotPasswordVerifyOTP({ email: forgotEmail, otp: forgotOtp });
                        setForgotToken(response.reset_token);
                        setForgotStep(3);
                      } catch (err: any) {
                        Alert.alert("Verification Failed", err.message || "Invalid or expired OTP.");
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    loading={forgotLoading}
                    style={styles.modalButton}
                  />
                </View>
              )}

              {forgotStep === 3 && (
                <View>
                  <Text style={styles.modalDescription}>
                    Enter your new secure password:
                  </Text>
                  <CustomInput
                    key="forgot-new-password"
                    label="New Password"
                    placeholder="••••••••"
                    value={forgotPassword}
                    onChangeText={setForgotPassword}
                    icon="lock"
                    secureTextEntry
                  />
                  <CustomInput
                    key="forgot-confirm-password"
                    label="Confirm New Password"
                    placeholder="••••••••"
                    value={forgotConfirm}
                    onChangeText={setForgotConfirm}
                    icon="lock"
                    secureTextEntry
                  />
                  <Button
                    title="Save New Password"
                    onPress={async () => {
                      if (!forgotPassword || !forgotConfirm) {
                        Alert.alert("Error", "Please fill in all password fields.");
                        return;
                      }
                      if (forgotPassword !== forgotConfirm) {
                        Alert.alert("Error", "Passwords do not match.");
                        return;
                      }
                      setForgotLoading(true);
                      try {
                        const response = await authApi.forgotPasswordReset({
                          email: forgotEmail,
                          reset_token: forgotToken,
                          password: forgotPassword,
                          confirm_password: forgotConfirm,
                        });
                        Alert.alert("Success", response.message || "Password updated successfully. You can now log in.");
                        setShowForgot(false);
                        setForgotStep(1);
                        setForgotEmail("");
                        setForgotOtp("");
                        setForgotToken("");
                        setForgotPassword("");
                        setForgotConfirm("");
                      } catch (err: any) {
                        Alert.alert("Reset Failed", err.message || "Failed to update password.");
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    loading={forgotLoading}
                    style={styles.modalButton}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9FB",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 72 : 54,
    paddingBottom: 32,
  },
  logoWrapper: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1f2937",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "400",
    lineHeight: 22,
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
  },
  inputWrapper: {
    marginBottom: 20,
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  inputContainer: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontSize: 16,
    fontWeight: "400",
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
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  button: {
    marginTop: 12,
    borderRadius: 12,
    height: 54,
    backgroundColor: COLORS.primary,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  otpButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(74, 21, 75, 0.15)",
    borderRadius: 12,
    height: 54,
  },
  otpButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingVertical: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalScroll: {
    flexGrow: 1,
  },
  modalDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalButton: {
    marginTop: 12,
    borderRadius: 14,
    height: 54,
  },
});

export default LoginScreen;
