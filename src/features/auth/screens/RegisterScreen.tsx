import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
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
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  style?: any;
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
  keyboardType = "default",
  style,
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={[styles.inputWrapper, style]}>
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
          keyboardType={keyboardType}
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

export const RegisterScreen: React.FC = () => {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [programEnrolledIn, setProgramEnrolledIn] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!username) nextErrors.username = "Username is required";
    if (!email) nextErrors.email = "Email is required";
    else if (!email.includes("@")) nextErrors.email = "Enter a valid email";
    if (!password) nextErrors.password = "Password is required";
    if (password !== password2) nextErrors.password2 = "Passwords do not match";
    if (!studentId) nextErrors.studentId = "Student ID is required";
    if (!programEnrolledIn) nextErrors.programEnrolledIn = "Program ID is required";
    if (!departmentId) nextErrors.departmentId = "Department ID is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      await authApi.registerStudent({
        username,
        email,
        password,
        password2,
        first_name: firstName,
        last_name: lastName,
        student_id: studentId,
        program_enrolled_in_id: programEnrolledIn,
        department_id: parseInt(departmentId, 10),
        contact_number: contactNumber,
      });

      Alert.alert(
        "Registration Successful",
        "An activation OTP has been sent to your email address.",
        [
          {
            text: "Verify Account",
            onPress: () => router.push({
              pathname: ROUTES.AUTH.OTP,
              params: { email }
            }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Please check registration fields.");
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a CampusNexus Student</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <CustomInput
              label="First Name"
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              icon="user"
              style={{ flex: 1, marginRight: 8 }}
            />
            <CustomInput
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              icon="user"
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <CustomInput
            label="Username"
            placeholder="johndoe"
            value={username}
            onChangeText={setUsername}
            icon="user"
            error={errors.username}
          />

          <CustomInput
            label="Email Address"
            placeholder="john.doe@college.edu.in"
            value={email}
            onChangeText={setEmail}
            icon="mail"
            keyboardType="email-address"
            error={errors.email}
          />

          <CustomInput
            label="Student ID"
            placeholder="e.g. STU123"
            value={studentId}
            onChangeText={setStudentId}
            icon="credit-card"
            error={errors.studentId}
          />

          <CustomInput
            label="Contact Number (Optional)"
            placeholder="e.g. +91 9876543210"
            value={contactNumber}
            onChangeText={setContactNumber}
            icon="phone"
            keyboardType="phone-pad"
          />

          <View style={styles.row}>
            <CustomInput
              label="Department ID"
              placeholder="e.g. 1"
              value={departmentId}
              onChangeText={setDepartmentId}
              icon="grid"
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
              error={errors.departmentId}
            />
            <CustomInput
              label="Program ID"
              placeholder="e.g. CS"
              value={programEnrolledIn}
              onChangeText={setProgramEnrolledIn}
              icon="award"
              style={{ flex: 1, marginLeft: 8 }}
              error={errors.programEnrolledIn}
            />
          </View>

          <CustomInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            icon="lock"
            secureTextEntry
            error={errors.password}
          />

          <CustomInput
            label="Confirm Password"
            placeholder="••••••••"
            value={password2}
            onChangeText={setPassword2}
            icon="lock"
            secureTextEntry
            error={errors.password2}
          />

          <Button
            title="Register Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already registered? </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push(ROUTES.AUTH.LOGIN)}
            >
              Log In
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
    backgroundColor: COLORS.primary, // Deep purple brand background
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
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 64 : 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 1.2,
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
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    width: "100%",
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

export default RegisterScreen;
