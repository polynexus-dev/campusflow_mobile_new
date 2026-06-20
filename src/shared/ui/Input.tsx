import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TextInput, ViewStyle, TextStyle, TouchableOpacity } from "react-native";
import { COLORS } from "../theme/colors";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  editable?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
  style,
  inputStyle,
  editable = true,
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  useEffect(() => {
    setIsSecure(secureTextEntry);
  }, [secureTextEntry]);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error ? styles.inputError : null, !editable ? styles.disabled : null]}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, inputStyle]}
          editable={editable}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>{isSecure ? "Show" : "Hide"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    color: COLORS.text,
    fontSize: 15,
    padding: 0, // Reset default padding
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
});
export default Input;
