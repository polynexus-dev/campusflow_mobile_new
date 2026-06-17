import React, { useState } from "react";
import { StyleSheet, View, Text, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";

export const VerifyOTPScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const emailParam = typeof params.email === "string" ? params.email : "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!email || !otp) {
      Alert.alert("Error", "Email and OTP verification code are required.");
      return;
    }
    setVerifying(true);

    try {
      const res = await authApi.verifyAccount({ email, otp });
      Alert.alert("Success", res.message || "Account activated! You can now log in.", [
        {
          text: "Login Now",
          onPress: () => router.replace(ROUTES.AUTH.LOGIN),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Invalid or expired OTP.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert("Error", "Email address is required to resend OTP.");
      return;
    }
    setResending(true);

    try {
      const res = await authApi.resendOTP({ email });
      Alert.alert("OTP Sent", res.message || "A new verification code was sent to your email.");
    } catch (err: any) {
      Alert.alert("Resend Failed", err.message || "Unable to resend OTP at this time.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Account Verification</Text>
          <Text style={styles.subtitle}>Enter the 6-digit OTP code sent to your email</Text>
        </View>

        <View style={styles.card}>
          <Input
            label="Email Address"
            placeholder="name@college.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!emailParam}
          />

          <Input
            label="Verification Code (OTP)"
            placeholder="123456"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
          />

          <Button
            title="Verify & Activate"
            onPress={handleVerify}
            loading={verifying}
            style={styles.button}
          />

          <Button
            title="Resend Code"
            onPress={handleResend}
            variant="outline"
            loading={resending}
            style={styles.resendButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.2,
    borderColor: COLORS.border,
  },
  button: {
    marginTop: 12,
  },
  resendButton: {
    marginTop: 12,
  },
});
export default VerifyOTPScreen;
