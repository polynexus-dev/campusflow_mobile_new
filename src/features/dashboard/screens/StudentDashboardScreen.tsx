import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useStudentDashboardData } from "../hooks/useStudentDashboardData";
import { ParticularItemRow } from "../components/ParticularItemRow";

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
          {/* Subtle Greeting & Name Pill with Gradient Border */}
          <LinearGradient
            colors={["#5D1E62", "#9333EA", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 12, padding: 1.5 }}
            className="h-11 flex-1 mr-4 shadow-sm"
          >
            <View className="flex-1 flex-row items-center bg-white rounded-xl px-4 h-full">
              <View className="w-2.5 h-2.5 rounded-full bg-[#5D1E62] mr-2 shrink-0" />
              <Text className="text-[12px] font-semibold text-slate-400 shrink-0">
                {getGreeting()},{" "}
              </Text>
              <Text className="text-[14px] font-bold text-slate-800 shrink ml-0.5" numberOfLines={1}>
                {user?.username || "Student"}
              </Text>
            </View>
          </LinearGradient>

          <View className="flex-row items-center gap-3.5">
            {/* Notification Bell Icon */}
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.NOTIFICATIONS)}
              activeOpacity={0.7}
              className="w-11 h-11 bg-white rounded-xl justify-center items-center shadow-sm relative"
            >
              <Feather name="bell" size={19} color="#1e293b" />
              {unreadCount > 0 && (
                <View className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#5D1E62] rounded-full border border-white" />
              )}
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.PROFILE)}
              activeOpacity={0.7}
              className="w-11 h-11 bg-purple-100 rounded-xl justify-center items-center shadow-sm"
            >
              <Text className="text-[#5D1E62] font-bold text-sm tracking-wide">
                {userInitials}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Biometrics Warning Banner */}
        {!isFaceRegistered && (
          <View className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex-row items-center justify-between shadow-sm">
            <View className="flex-1 mr-3 flex-row items-center gap-3">
              <View className="w-10 h-10 bg-purple-100 rounded-lg justify-center items-center">
                <Feather name="shield" size={18} color="#5D1E62" />
              </View>
              <View className="flex-1">
                <Text className="text-purple-950 text-[13px] font-bold">Biometrics Required</Text>
                <Text className="text-purple-700 text-[11px] font-semibold mt-0.5">Register face to enable mobile attendance.</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => router.push(ROUTES.APP.REGISTER_FACE)}
              className="bg-[#5D1E62] px-3.5 py-2 rounded-lg"
            >
              <Text className="text-white text-xs font-bold">Register</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Live Bus Tracking Card — only for students with an active bus pass */}
        {data.bus && (
        <View className="relative overflow-hidden bg-[#5D1E62] rounded-xl p-6 mb-6 shadow-md">
          {/* Radial concentric circle pattern overlays */}
          <View className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/[0.04] border border-white/[0.04]" />
          <View className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/[0.04] border border-white/[0.06]" />
          <View className="absolute -right-0 -top-0 w-24 h-24 rounded-full bg-white/[0.05] border border-white/[0.08]" />

          <View className="flex-row items-center">
            <View className={`w-2.5 h-2.5 rounded-full mr-2 ${data.bus.isLive ? "bg-white" : "bg-white/40"}`} />
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
              className="bg-white px-6 py-3 rounded-lg shadow-sm"
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
            className="flex-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm justify-between"
          >
            <View>
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Attendance</Text>
              <Text className="text-[28px] font-black text-slate-800 mt-2">
                {attendancePct != null && !loading ? `${Math.round(attendancePct)}%` : "—"}
              </Text>
            </View>
            <View className="w-full h-1.5 bg-slate-100 rounded-sm mt-4 overflow-hidden">
              <View
                className="h-full rounded-sm bg-[#5D1E62]"
                style={{ width: `${attendancePct ?? 0}%` }}
              />
            </View>
            {belowMinimum && (
              <Text className="text-[11px] font-bold text-purple-800 mt-2">
                Below {data.attendance?.minimumRequired}% minimum
              </Text>
            )}
          </TouchableOpacity>

          {/* Fees due Card */}
          <TouchableOpacity 
            onPress={() => router.push(ROUTES.APP.FEES)}
            activeOpacity={0.9}
            className="flex-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm justify-between"
          >
            <View>
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Fees due</Text>
              <Text className="text-[28px] font-black text-slate-800 mt-2">
                {data.fees && !loading ? money(data.fees.totalDue) : "—"}
              </Text>
            </View>
            {data.fees?.nextDueDate ? (
              <View className="self-start bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1 mt-3">
                <Text className="text-[11px] font-bold text-purple-700">Due {shortDate(data.fees.nextDueDate)}</Text>
              </View>
            ) : data.fees && !loading ? (
              <View className="self-start bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1 mt-3">
                <Text className="text-[11px] font-bold text-purple-700">All paid</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Mark Attendance */}
        <TouchableOpacity
          onPress={() => router.push(ROUTES.APP.MARK_ATTENDANCE)}
          activeOpacity={0.9}
          className="bg-white border border-slate-100 rounded-xl p-4 mb-6 shadow-sm flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-purple-50 rounded-lg justify-center items-center">
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
            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex-row items-center justify-between"
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
              <View className="bg-purple-50 rounded-md px-3 py-1.5 ml-2 border border-purple-100">
                <Text className="text-[11px] font-bold text-purple-700">{relative(data.nextLecture.start)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Particulars Section - Single Unified Vertical Container */}
        <View className="mb-6">
          <Text className="text-[18px] font-black text-slate-800 tracking-tight mb-3">Particulars</Text>
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {[
              {
                id: "assignments",
                title: "Assignments",
                subtitle: `${shown(data.assignmentsDueThisWeek)} due this week`,
                iconName: "file-text" as const,
                route: ROUTES.APP.ASSIGNMENTS,
                highlightSubtitle: true,
              },
              {
                id: "library",
                title: "Library",
                subtitle: data.libraryOverdue ? `${data.libraryOverdue} overdue` : `${shown(data.libraryDueBack)} book(s) to return`,
                iconName: "book-open" as const,
                route: ROUTES.APP.LIBRARY,
                highlightSubtitle: Boolean(data.libraryOverdue),
              },
              {
                id: "clearance",
                title: "Clearance",
                subtitle: "No-dues status",
                iconName: "check-circle" as const,
                route: ROUTES.APP.CLEARANCE,
                highlightSubtitle: false,
              },
              {
                id: "announcements",
                title: "Announcements",
                subtitle: `${shown(data.newAnnouncements)} this week`,
                iconName: "volume-2" as const,
                route: ROUTES.APP.ANNOUNCEMENTS,
                highlightSubtitle: true,
              },
              {
                id: "exams",
                title: "Exams",
                subtitle: "Schedule & results",
                iconName: "edit-3" as const,
                route: ROUTES.APP.EXAMS,
                highlightSubtitle: false,
              },
              {
                id: "transcript",
                title: "Transcript",
                subtitle: "SGPA & CGPA",
                iconName: "award" as const,
                route: ROUTES.APP.TRANSCRIPT,
                highlightSubtitle: false,
              },
            ].map((item, index, arr) => (
              <ParticularItemRow
                key={item.id}
                iconName={item.iconName}
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => router.push(item.route)}
                isLast={index === arr.length - 1}
                highlightSubtitle={item.highlightSubtitle}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default StudentDashboardScreen;
