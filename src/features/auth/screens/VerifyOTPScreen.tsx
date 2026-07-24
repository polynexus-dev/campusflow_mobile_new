import React, { useState, useRef, useEffect } from "react";
import { View, Text, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { cssInterop } from "nativewind";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";

// Register custom Button component for NativeWind support
cssInterop(Button, { className: "style" });

interface EmailInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ label, placeholder, value, onChangeText }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View className="mb-6 w-full">
      <Text className="text-sm font-semibold text-textMain mb-2">{label}</Text>
      <View
        className={`h-[54px] rounded-xl bg-white border px-4 flex-row items-center ${
          isFocused ? "border-primary" : "border-[#E2E8F0]"
        }`}
      >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          keyboardType="email-address"
          autoCapitalize="none"
          className="flex-1 h-full text-textMain text-base font-normal p-0"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
};

export const VerifyOTPScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const emailParam = typeof params.email === "string" ? params.email : "";

  const [email, setEmail] = useState(emailParam || "student@gmail.com");
  const [step, setStep] = useState(emailParam ? 2 : 1);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(emailParam ? 30 : 0);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const otpLength = 6;
  const otpArray = Array(otpLength).fill(0);
  const inputRef = useRef<TextInput>(null);

  // Mask Email Helper
  const maskEmail = (emailStr: string) => {
    const [localPart, domain] = emailStr.split("@");
    if (!localPart || !domain) return emailStr;
    if (localPart.length <= 2) {
      return `${localPart}•••@${domain}`;
    }
    return `${localPart.substring(0, 2)}••••@${domain}`;
  };

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your college email address.");
      return;
    }
    setResending(true);

    // Mock bypass for testing
    if (email.trim().toLowerCase() === "student@gmail.com") {
      setTimeout(() => {
        setResending(false);
        Alert.alert("OTP Sent", "A verification code has been sent to your email (Mocked).");
        setStep(2);
        setTimer(30);
      }, 800);
      return;
    }

    try {
      const res = await authApi.resendOTP({ email });
      Alert.alert("OTP Sent", res.message || "A verification code has been sent to your email.");
      setStep(2);
      setTimer(30);
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Unable to send verification code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (!email || !otp || otp.length < otpLength) {
      Alert.alert("Error", "Please enter the full 6-digit verification code.");
      return;
    }
    setVerifying(true);

    // Mock bypass for testing
    if (otp === "123456") {
      setTimeout(() => {
        setVerifying(false);
        Alert.alert("Success", "Account activated! You can now log in (Mocked/Bypassed).", [
          {
            text: "Login Now",
            onPress: () => router.replace(ROUTES.AUTH.LOGIN),
          },
        ]);
      }, 800);
      return;
    }

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

    // Mock bypass for testing
    if (email.trim().toLowerCase() === "student@gmail.com") {
      setTimeout(() => {
        setResending(false);
        Alert.alert("OTP Sent", "A new verification code was sent to your email (Mocked).");
        setTimer(30);
      }, 800);
      return;
    }

    try {
      const res = await authApi.resendOTP({ email });
      Alert.alert("OTP Sent", res.message || "A new verification code was sent to your email.");
      setTimer(30);
    } catch (err: any) {
      Alert.alert("Resend Failed", err.message || "Unable to resend OTP at this time.");
    } finally {
      setResending(false);
    }
  };

  const formattedTime = timer < 10 ? `00:0${timer}` : `00:${timer}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#F9F9FB]"
    >
      <StatusBar style="dark" />
      
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === "ios" ? 54 : 36 }}
        className="flex-grow p-6 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
          className="w-11 h-11 rounded-full bg-white justify-center items-center mb-16 mt-2"
          onPress={() => {
            if (step === 2 && !emailParam) {
              setStep(1);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color="#1f2937" />
        </TouchableOpacity>

        {step === 1 ? (
          <View className="w-full px-1">
            <Text className="text-3xl font-extrabold text-textMain tracking-[-0.5px] mb-3">
              OTP Activation
            </Text>
            <Text className="text-[15px] text-textSecondary font-normal leading-[22px] mb-10">
              Enter your college email address to receive your 6-digit code.
            </Text>

            <View className="mb-8">
              <EmailInput
                label="Email Address"
                placeholder="ananya.rao@nexuscollege.edu"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Button
              title={resending ? "Sending code..." : "Send code"}
              onPress={handleSendCode}
              loading={resending}
              className="rounded-xl h-[56px] bg-primary justify-center items-center w-full mt-2"
            />
          </View>
        ) : (
          <View className="w-full px-1">
            <Text className="text-3xl font-extrabold text-textMain tracking-[-0.5px] mb-3">
              Enter the code
            </Text>
            <Text className="text-[15px] text-textSecondary font-normal leading-[22px] mb-12">
              We sent a 6-digit code to <Text className="text-textMain font-semibold">{maskEmail(email)}</Text>
            </Text>

            <TouchableOpacity
              className="flex-row w-full mb-8 gap-x-3"
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
            >
              {otpArray.map((_, index) => {
                const char = otp[index] || "";
                const isFocusedBox = isInputFocused && index === otp.length;
                return (
                  <View
                    key={index}
                    className={`flex-1 h-16 rounded-xl border bg-white justify-center items-center ${
                      isFocusedBox ? "border-primary border-2" : "border-[#cbd5e1]"
                    }`}
                  >
                    <Text
                      className={`text-2xl font-bold text-textMain ${
                        isFocusedBox && char === "" ? "text-primary font-light" : ""
                      }`}
                    >
                      {char === "" && isFocusedBox ? "|" : char}
                    </Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(text) => {
                const cleanText = text.replace(/[^0-9]/g, "");
                if (cleanText.length <= otpLength) {
                  setOtp(cleanText);
                }
              }}
              keyboardType="number-pad"
              maxLength={otpLength}
              className="absolute opacity-0 w-px h-px"
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              textContentType="oneTimeCode"
            />

            <View className="mb-8">
              {timer > 0 ? (
                <Text className="text-textSecondary text-sm">
                  Resend code in <Text className="text-primary font-bold">{formattedTime}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text className="text-primary font-bold text-sm">
                    {resending ? "Resending..." : "Resend code"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Button
              title="Verify & continue"
              onPress={handleVerify}
              loading={verifying}
              className="rounded-xl h-[56px] bg-primary justify-center items-center w-full mt-2"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VerifyOTPScreen;
