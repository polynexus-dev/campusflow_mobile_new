import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const tabBarColor = "#ffffffff"; // White background matching COLORS.surface
  const activeTintColor = "#4a154bff"; // Deep Purple matching COLORS.primary
  const inactiveTintColor = "#64748bff"; // Slate grey matching COLORS.textSecondary
  const indicatorColor = "#4a154b1f"; // Translucent primary color for click ripple/indicator selection

  return (
    <NativeTabs
      iconColor={{
        default: inactiveTintColor,
        selected: activeTintColor,
      }}
      labelStyle={{
        default: { color: inactiveTintColor },
        selected: { color: activeTintColor },
      }}
      disableTransparentOnScrollEdge
      backgroundColor={tabBarColor}
      indicatorColor={indicatorColor}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" drawable="ic_menu_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="timetable">
        <NativeTabs.Trigger.Label>Timetable</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" drawable="ic_menu_today" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="assignments">
        <NativeTabs.Trigger.Label>Assignments</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text.fill" drawable="ic_menu_agenda" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" drawable="ic_menu_manage" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
