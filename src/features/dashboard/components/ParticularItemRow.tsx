import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

export interface ParticularItemRowProps {
  iconName: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
  highlightSubtitle?: boolean;
}

export const ParticularItemRow: React.FC<ParticularItemRowProps> = ({
  iconName,
  title,
  subtitle,
  onPress,
  isLast = false,
  highlightSubtitle = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center justify-between p-4 ${isLast ? "" : "border-b border-slate-100"}`}
    >
      <View className="flex-row items-center flex-1 mr-4">
        <View className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-lg justify-center items-center mr-4 shrink-0">
          <Feather name={iconName} size={18} color="#5D1E62" />
        </View>
        <View className="flex-1">
          <Text className="text-slate-800 text-[14px] font-bold" numberOfLines={1}>
            {title}
          </Text>
          <Text
            className={`text-[11px] font-semibold mt-0.5 ${
              highlightSubtitle ? "text-purple-700" : "text-slate-400"
            }`}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color="#94a3b8" />
    </TouchableOpacity>
  );
};
