import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";
import { useAuthStore } from "@store/authStore";

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a CampusFlow Student</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Input
              label="First Name"
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <Input
            label="Username"
            placeholder="johndoe"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
          />

          <Input
            label="Email Address"
            placeholder="john.doe@college.edu.in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
          />

          <Input
            label="Student ID"
            placeholder="e.g. STU123"
            value={studentId}
            onChangeText={setStudentId}
            error={errors.studentId}
          />

          <View style={styles.row}>
            <Input
              label="Department ID"
              placeholder="e.g. 1"
              value={departmentId}
              onChangeText={setDepartmentId}
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
              error={errors.departmentId}
            />
            <Input
              label="Program ID"
              placeholder="e.g. CS"
              value={programEnrolledIn}
              onChangeText={setProgramEnrolledIn}
              style={{ flex: 1, marginLeft: 8 }}
              error={errors.programEnrolledIn}
            />
          </View>

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="••••••••"
            value={password2}
            onChangeText={setPassword2}
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white, // White contrast title
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)", // Soft translucent text
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface, // White card container
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 40,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  row: {
    flexDirection: "row",
    width: "100%",
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

export default RegisterScreen;
