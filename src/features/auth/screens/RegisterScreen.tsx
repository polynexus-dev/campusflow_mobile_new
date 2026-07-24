import React, { useState } from "react";
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/constants/route";
import { Feather } from "@expo/vector-icons";
import { cssInterop } from "nativewind";

// Register custom Button component for NativeWind support
cssInterop(Button, { className: "style" });

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
  className?: string;
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
  className,
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View className={`mb-[18px] w-full ${className || ""}`}>
      <Text className="text-[13px] font-bold text-textSecondary mb-2 tracking-[0.2px]">{label}</Text>
      <View
        className={`h-[54px] rounded-[14px] bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] px-4 flex-row items-center ${
          error ? "border-error" : ""
        }`}
      >
        <Feather
          name={icon}
          size={18}
          color={COLORS.primary}
          style={{ marginRight: 12 }}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          className="flex-1 h-full text-textMain text-[15px] font-medium p-0"
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
            className="py-2.5 pl-2.5"
          >
            <Feather
              name={isSecure ? "eye-off" : "eye"}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-error text-xs font-semibold mt-1.5 ml-1">{error}</Text>}
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
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!firstName) nextErrors.firstName = "First name is required";
    if (!lastName) nextErrors.lastName = "Last name is required";
    if (!username) nextErrors.username = "Username is required";
    if (!email) nextErrors.email = "Email is required";
    else if (!email.includes("@")) nextErrors.email = "Enter a valid email";
    if (!studentId) nextErrors.studentId = "Student ID is required";
    if (!contactNumber) nextErrors.contactNumber = "Contact number is required";
    if (!departmentId) nextErrors.departmentId = "Department ID is required";
    if (!programEnrolledIn) nextErrors.programEnrolledIn = "Program ID is required";
    if (!dateOfBirth) nextErrors.dateOfBirth = "Date of birth is required";
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) nextErrors.dateOfBirth = "Use YYYY-MM-DD format";
    if (!password) nextErrors.password = "Password is required";
    if (password !== password2) nextErrors.password2 = "Passwords do not match";
    
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
 
    try {
      const response = await authApi.registerStudent({
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
        consent_given: true,
        date_of_birth: dateOfBirth,
        is_demo_tenant: true,
      });

      if (response && response.auto_activated) {
        Alert.alert(
          "Registration Successful",
          response.message || "Demo account auto-activated successfully.",
          [
            {
              text: "Login Now",
              onPress: () => router.replace(ROUTES.AUTH.LOGIN),
            },
          ]
        );
      } else {
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
      }
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Please check registration fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-primary relative"
    >
      <StatusBar style="light" />

      {/* Ambient background glow elements for a premium layout feel */}
      <View className="absolute -top-[100px] -right-[100px] w-[350px] h-[350px] rounded-[175px] bg-secondary/15 -z-10" />
      <View className="absolute -bottom-[120px] -left-[120px] w-[320px] h-[320px] rounded-[160px] bg-accent/18 -z-10" />

      <ScrollView
        className="flex-1"
        contentContainerClassName={`grow p-6 pb-16 ${Platform.OS === "ios" ? "pt-16" : "pt-12"}`}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-7">
          <Text className="text-[32px] font-black text-white tracking-[1.2px]">Create Account</Text>
          <Text className="text-sm text-white/70 mt-1.5 font-semibold tracking-[0.5px]">Register as a CampusNexus Student</Text>
        </View>

        <View className="bg-surface rounded-[28px] p-6 border border-white/15 shadow-2xl mb-5">
          <View className="flex-row w-full">
            <CustomInput
              label="First Name"
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              icon="user"
              className="flex-1 mr-2"
              error={errors.firstName}
            />
            <CustomInput
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              icon="user"
              className="flex-1 ml-2"
              error={errors.lastName}
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
            label="Contact Number"
            placeholder="e.g. 9876543210"
            value={contactNumber}
            onChangeText={setContactNumber}
            icon="phone"
            keyboardType="phone-pad"
            error={errors.contactNumber}
          />

          <CustomInput
            label="Date of Birth"
            placeholder="YYYY-MM-DD (e.g. 2002-05-15)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            icon="calendar"
            error={errors.dateOfBirth}
          />

          <View className="flex-row w-full">
            <CustomInput
              label="Department ID"
              placeholder="e.g. 1"
              value={departmentId}
              onChangeText={setDepartmentId}
              icon="grid"
              keyboardType="numeric"
              className="flex-1 mr-2"
              error={errors.departmentId}
            />
            <CustomInput
              label="Program ID"
              placeholder="e.g. CS"
              value={programEnrolledIn}
              onChangeText={setProgramEnrolledIn}
              icon="award"
              className="flex-1 ml-2"
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
            className="mt-2 rounded-[14px] h-[54px] shadow-lg shadow-primary"
          />

          <View className="flex-row justify-center mt-6">
            <Text className="text-textSecondary text-sm font-medium">Already registered? </Text>
            <Text
              className="text-primary text-sm font-bold"
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

export default RegisterScreen;
