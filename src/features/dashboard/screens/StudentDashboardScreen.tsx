import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStudentDashboardData } from "../hooks/useStudentDashboardData";

export const StudentDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const { data, loading } = useStudentDashboardData();
  const unreadCount = data.unreadNotifications;

  // "—" while loading or when that source failed, never a made-up number.
  const shown = (value: string | number | null | undefined) => (loading || value == null ? "—" : String(value));
  const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const clock = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const minutesUntil = (d: Date) => Math.round((d.getTime() - Date.now()) / 60000);
  const relative = (d: Date) => {
    const mins = minutesUntil(d);
    if (mins <= 0) return "now";
    if (mins < 60) return `in ${mins} min`;
    if (mins < 24 * 60) return `in ${Math.round(mins / 60)} h`;
    return d.toLocaleDateString(undefined, { weekday: "short" });
  };
  const attendancePct = data.attendance?.percentage ?? null;
  const belowMinimum =
    attendancePct != null && data.attendance?.minimumRequired != null && attendancePct < data.attendance.minimumRequired;

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

  const userInitials = getInitials(user?.username || "Student");
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
          {user?.username || "Student"}
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
              {user?.username || "Student"}
            </Text>
            <Text className="text-[12px] font-semibold text-slate-400 mt-1">
              {getFormattedDate()}{data.attendance?.termName ? ` · ${data.attendance.termName}` : ""}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {/* Notification Bell Icon */}
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.NOTIFICATIONS)}
              activeOpacity={0.7}
              className="w-11 h-11 bg-white rounded-full justify-center items-center shadow-sm relative border border-slate-100"
            >
              <Feather name="bell" size={20} color="#1e293b" />
              {unreadCount > 0 && (
                <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
              )}
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

        {/* Live Bus Tracking Card — only for students with an active bus pass */}
        {data.bus && (
        <View className="relative overflow-hidden bg-[#5D1E62] rounded-3xl p-6 mb-6 shadow-md">
          {/* Radial concentric circle pattern overlays */}
          <View className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/[0.04] border border-white/[0.04]" />
          <View className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/[0.04] border border-white/[0.06]" />
          <View className="absolute -right-0 -top-0 w-24 h-24 rounded-full bg-white/[0.05] border border-white/[0.08]" />

          <View className="flex-row items-center">
            <View className={`w-2.5 h-2.5 rounded-full mr-2 ${data.bus.isLive ? "bg-emerald-400" : "bg-white/40"}`} />
            <Text className="text-white/80 text-[11px] font-black tracking-widest uppercase">{data.bus.routeName}</Text>
          </View>

          <Text className="text-white text-[24px] font-black mt-2.5 tracking-tight leading-snug">
            {data.bus.isLive
              ? data.bus.distanceKm != null ? `Bus is ${data.bus.distanceKm.toFixed(1)} km away` : "Bus is running"
              : "Bus not running right now"}
          </Text>
          <Text className="text-white/60 text-[12px] font-bold mt-1">
            {data.bus.boardingStop ? `Your stop: ${data.bus.boardingStop}` : "Tap track live for the route map"}
          </Text>

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
        )}

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
              <Text className="text-[28px] font-black text-slate-800 mt-2">
                {attendancePct != null && !loading ? `${Math.round(attendancePct)}%` : "—"}
              </Text>
            </View>
            <View className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <View
                className={`h-full rounded-full ${belowMinimum ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${attendancePct ?? 0}%` }}
              />
            </View>
            {belowMinimum && (
              <Text className="text-[11px] font-bold text-red-600 mt-2">
                Below {data.attendance?.minimumRequired}% minimum
              </Text>
            )}
          </TouchableOpacity>

          {/* Fees due Card */}
          <TouchableOpacity 
            onPress={() => router.push(ROUTES.APP.FEES)}
            activeOpacity={0.9}
            className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm justify-between"
          >
            <View>
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Fees due</Text>
              <Text className="text-[28px] font-black text-slate-800 mt-2">
                {data.fees && !loading ? money(data.fees.totalDue) : "—"}
              </Text>
            </View>
            {data.fees?.nextDueDate ? (
              <View className="self-start bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1 mt-3">
                <Text className="text-[11px] font-bold text-orange-600">Due {shortDate(data.fees.nextDueDate)}</Text>
              </View>
            ) : data.fees && !loading ? (
              <View className="self-start bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 mt-3">
                <Text className="text-[11px] font-bold text-emerald-600">All paid</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Mark Attendance */}
        <TouchableOpacity
          onPress={() => router.push(ROUTES.APP.MARK_ATTENDANCE)}
          activeOpacity={0.9}
          className="bg-white border border-slate-100 rounded-3xl p-4 mb-6 shadow-sm flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-purple-50 rounded-xl justify-center items-center">
              <Feather name="camera" size={18} color="#5D1E62" />
            </View>
            <Text className="text-slate-800 font-extrabold text-[14px]">Mark attendance</Text>
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
              {data.nextLecture ? (
                <>
                  <View className="items-center min-w-[50px]">
                    <Text className="text-[18px] font-black text-purple-950">{clock(data.nextLecture.start)}</Text>
                    <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {Math.max(0, Math.round((data.nextLecture.end.getTime() - data.nextLecture.start.getTime()) / 60000))} min
                    </Text>
                  </View>
                  <View className="w-[1px] h-8 bg-slate-200 mx-4" />
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-slate-800" numberOfLines={1}>{data.nextLecture.title}</Text>
                    <Text className="text-[12px] font-semibold text-slate-400 mt-0.5" numberOfLines={1}>
                      {[data.nextLecture.room && `Room ${data.nextLecture.room}`, data.nextLecture.teacher].filter(Boolean).join(" · ") || "—"}
                    </Text>
                  </View>
                </>
              ) : (
                <Text className="text-[14px] font-semibold text-slate-400">
                  {loading ? "Loading…" : "No upcoming lectures"}
                </Text>
              )}
            </View>
            {data.nextLecture && (
              <View className="bg-purple-50 rounded-full px-3 py-1.5 ml-2 border border-purple-100">
                <Text className="text-[11px] font-bold text-purple-700">{relative(data.nextLecture.start)}</Text>
              </View>
            )}
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
                <Text className="text-[#EA580C] text-[11px] font-bold mt-0.5" numberOfLines={1}>{shown(data.assignmentsDueThisWeek)} due this week</Text>
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
                <Text className={`text-[11px] font-bold mt-0.5 ${data.libraryOverdue ? "text-red-600" : "text-slate-400"}`} numberOfLines={1}>
                  {data.libraryOverdue ? `${data.libraryOverdue} overdue` : `${shown(data.libraryDueBack)} book(s) to return`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Second Row */}
          <View className="flex-row gap-3">
            {/* Clearance (leave is staff-only on the backend, so students get no Leave tile) */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.CLEARANCE)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-sky-50 border border-sky-100 rounded-2xl justify-center items-center">
                <Feather name="check-circle" size={18} color="#0284c7" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Clearance</Text>
                <Text className="text-slate-400 text-[11px] font-bold mt-0.5" numberOfLines={1}>No-dues status</Text>
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
                <Text className="text-[#a855f7] text-[11px] font-bold mt-0.5" numberOfLines={1}>{shown(data.newAnnouncements)} this week</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Third Row */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.EXAMS)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-2xl justify-center items-center">
                <Feather name="edit-3" size={18} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Exams</Text>
                <Text className="text-slate-400 text-[11px] font-bold mt-0.5" numberOfLines={1}>Schedule & results</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(ROUTES.APP.TRANSCRIPT)}
              activeOpacity={0.9}
              className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-2xl justify-center items-center">
                <Feather name="award" size={18} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-[14px] font-black" numberOfLines={1}>Transcript</Text>
                <Text className="text-slate-400 text-[11px] font-bold mt-0.5" numberOfLines={1}>SGPA & CGPA</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default StudentDashboardScreen;
