import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const StudentDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: showStickyHeader ? 0 : -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: showStickyHeader ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showStickyHeader]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > 60) {
      setShowStickyHeader(true);
    } else {
      setShowStickyHeader(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(user?.username || "Ananya Rao");
  const isFaceRegistered = user?.student_profile?.is_face_registered ?? false;

  const getFormattedDate = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const d = new Date();
    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    return `${dayName} ${dateNum} ${monthName}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <Animated.View 
        pointerEvents={showStickyHeader ? "auto" : "none"}
        style={{ 
          paddingTop: insets.top + 12,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim
        }}
        className="absolute top-0 left-0 right-0 bg-white/95 border-b border-slate-100 flex-row justify-between items-center px-6 pb-3.5 z-50 shadow-sm"
      >
        <Text className="text-[16px] font-extrabold text-slate-800" numberOfLines={1}>
          {user?.username || "Ananya"}
        </Text>
        <View className="flex-row items-center">
          <Feather name="calendar" size={14} color="#5D1E62" className="mr-1.5" />
          <Text className="text-xs font-bold text-[#5D1E62] uppercase tracking-wider">{getFormattedDate()}</Text>
        </View>
      </Animated.View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: Platform.OS === "ios" ? insets.top + 16 : insets.top + 20,
          paddingBottom: 40
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1 mr-4">
            <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
              {getGreeting()}
            </Text>
            <Text className="text-[22px] font-black text-slate-800 mt-0.5" numberOfLines={1}>
              {user?.username || "Ananya"}
            </Text>
            <Text className="text-[12px] font-semibold text-slate-400 mt-1">
              {getFormattedDate()} · Semester 5
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {/* Notification Bell Icon */}
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.ANNOUNCEMENTS)}
              activeOpacity={0.7}
              className="w-11 h-11 bg-white rounded-full justify-center items-center shadow-sm relative border border-slate-100"
            >
              <Feather name="bell" size={20} color="#1e293b" />
              <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.PROFILE)}
              activeOpacity={0.7}
              className="w-11 h-11 bg-purple-100 rounded-full justify-center items-center shadow-sm border border-purple-200"
            >
              <Text className="text-purple-700 font-bold text-sm tracking-wide">
                {userInitials}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Biometrics Warning Banner */}
        {!isFaceRegistered && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex-row items-center justify-between shadow-sm">
            <View className="flex-1 mr-3 flex-row items-center gap-3">
              <View className="w-10 h-10 bg-amber-100 rounded-xl justify-center items-center">
                <Feather name="shield" size={18} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-amber-800 text-[13px] font-bold">Biometrics Required</Text>
                <Text className="text-amber-600 text-[11px] font-semibold mt-0.5">Register face to enable mobile attendance.</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.REGISTER_FACE)}
              className="bg-amber-600 px-3.5 py-2 rounded-xl"
            >
              <Text className="text-white text-xs font-bold">Register</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Live Bus Tracking Card */}
        <View className="relative overflow-hidden bg-[#5D1E62] rounded-3xl p-6 mb-6 shadow-md">
          {/* Radial concentric circle pattern overlays */}
          <View className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/[0.04] border border-white/[0.04]" />
          <View className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/[0.04] border border-white/[0.06]" />
          <View className="absolute -right-0 -top-0 w-24 h-24 rounded-full bg-white/[0.05] border border-white/[0.08]" />

          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2" />
            <Text className="text-white/80 text-[11px] font-black tracking-widest uppercase">ROUTE 12 · CAMPUS LOOP</Text>
          </View>

          <Text className="text-white text-[24px] font-black mt-2.5 tracking-tight leading-snug">Bus arriving in 8 min</Text>
          <Text className="text-white/60 text-[12px] font-bold mt-1">Main Gate stop · updated 4s ago</Text>

          <View className="flex-row mt-6 gap-3">
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.BUS_TRACKING)}
              activeOpacity={0.9}
              className="bg-white px-6 py-3 rounded-full shadow-sm"
            >
              <Text className="text-[#5D1E62] font-black text-[13px]">Track live</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.BUS_TRACKING)}
              activeOpacity={0.8}
              className="px-4 py-3 justify-center"
            >
              <Text className="text-white/95 font-black text-[13px]">View stops</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Attendance & Fees due Cards */}
        <View className="flex-row gap-4 mb-6">
          {/* Attendance Card */}
          <TouchableOpacity 
            onPress={() => router.push(ROUTES.APP.ATTENDANCE_HISTORY)}
            activeOpacity={0.9}
            className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm justify-between"
          >
            <View>
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Attendance</Text>
              <Text className="text-[28px] font-black text-slate-800 mt-2">92%</Text>
            </View>
            <View className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <View className="h-full bg-emerald-500 rounded-full w-[92%]" />
            </View>
          </TouchableOpacity>

          {/* Fees due Card */}
          <TouchableOpacity 
            onPress={() => router.push(ROUTES.APP.FEES)}
            activeOpacity={0.9}
            className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm justify-between"
          >
            <View>
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Fees due</Text>
              <Text className="text-[28px] font-black text-slate-800 mt-2">₹24,500</Text>
            </View>
            <View className="self-start bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1 mt-3">
              <Text className="text-[11px] font-bold text-orange-600">Due 20 Jul</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Dummy Attendance Button */}
        <TouchableOpacity
          onPress={() => router.push(ROUTES.APP.MARK_ATTENDANCE)}
          activeOpacity={0.9}
          className="bg-white border border-slate-100 rounded-3xl p-4 mb-6 shadow-sm flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-purple-50 rounded-xl justify-center items-center">
              <Feather name="camera" size={18} color="#5D1E62" />
            </View>
            <Text className="text-slate-800 font-extrabold text-[14px]">Dummy attendance</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#94a3b8" />
        </TouchableOpacity>

        {/* Up next Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[18px] font-black text-slate-800 tracking-tight">Up next</Text>
            <TouchableOpacity onPress={() => router.push(ROUTES.APP.TIMETABLE)}>
              <Text className="text-[13px] font-bold text-[#5D1E62]">Timetable</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => router.push(ROUTES.APP.TIMETABLE)}
            activeOpacity={0.9}
            className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="items-center min-w-[50px]">
                <Text className="text-[18px] font-black text-purple-950">9:00</Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">50 min</Text>
              </View>
              <View className="w-[1px] h-8 bg-slate-200 mx-4" />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-slate-800" numberOfLines={1}>CS-301 · Operating Systems</Text>
                <Text className="text-[12px] font-semibold text-slate-400 mt-0.5" numberOfLines={1}>Room B-204 · Dr. Menon</Text>
              </View>
            </View>
            <View className="bg-purple-50 rounded-full px-3 py-1.5 ml-2 border border-purple-100">
              <Text className="text-[11px] font-bold text-purple-700">in 25 min</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick actions 2x2 Grid */}
        <View className="gap-3">
          {/* First Row */}
          <View className="flex-row gap-3">
            {/* Assignments */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.ASSIGNMENTS)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-pink-50 border border-pink-100 rounded-2xl justify-center items-center">
                <Feather name="file-text" size={18} color="#db2777" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Assignments</Text>
                <Text className="text-[#EA580C] text-[11px] font-bold mt-0.5" numberOfLines={1}>2 due this week</Text>
              </View>
            </TouchableOpacity>

            {/* Library */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.LIBRARY)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-2xl justify-center items-center">
                <Feather name="book-open" size={18} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Library</Text>
                <Text className="text-slate-400 text-[11px] font-bold mt-0.5" numberOfLines={1}>1 book due back</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Second Row */}
          <View className="flex-row gap-3">
            {/* Leave */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.LEAVE)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-purple-50 border border-purple-100 rounded-2xl justify-center items-center">
                <Feather name="calendar" size={18} color="#9333ea" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Leave</Text>
                <Text className="text-emerald-600 text-[11px] font-bold mt-0.5" numberOfLines={1}>1 approved</Text>
              </View>
            </TouchableOpacity>

            {/* Announcements */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.ANNOUNCEMENTS)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-violet-50 border border-violet-100 rounded-2xl justify-center items-center">
                <Feather name="volume-2" size={18} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Announcements</Text>
                <Text className="text-[#a855f7] text-[11px] font-bold mt-0.5" numberOfLines={1}>3 new</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default StudentDashboardScreen;
