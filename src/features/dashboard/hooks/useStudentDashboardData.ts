import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import httpClient from "@services/api/httpClient";
import { useAuthStore } from "@store/authStore";
import { feeApi } from "@/features/fees/services/feeApi";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { libraryApi } from "@/features/library/api/libraryApi";
import { notificationsApi } from "@/features/notifications/api/notificationsApi";

// Real data for the student dashboard cards. Each source is fetched
// independently (Promise.allSettled) so one failing endpoint only blanks its
// own card: every field is null when unknown, and the screen shows "—".

export interface StudentDashboardData {
  attendance: { percentage: number | null; minimumRequired: number | null; termName: string | null } | null;
  fees: { totalDue: number; nextDueDate: string | null } | null;
  bus: { routeName: string; boardingStop: string | null; isLive: boolean; distanceKm: number | null } | null;
  nextLecture: { title: string; room: string | null; teacher: string | null; start: Date; end: Date } | null;
  assignmentsDueThisWeek: number | null;
  libraryDueBack: number | null;
  libraryOverdue: number | null;
  newAnnouncements: number | null;
  unreadNotifications: number;
}

const EMPTY: StudentDashboardData = {
  attendance: null,
  fees: null,
  bus: null,
  nextLecture: null,
  assignmentsDueThisWeek: null,
  libraryDueBack: null,
  libraryOverdue: null,
  newAnnouncements: null,
  unreadNotifications: 0,
};

const asList = (data: any): any[] => (Array.isArray(data) ? data : data?.results || []);
const valueOf = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function useStudentDashboardData() {
  const [data, setData] = useState<StudentDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const now = new Date();
    // The attendance summary is student-only on the backend (403 for staff);
    // skip it rather than raise an error if a non-student ever lands here.
    const isStudent = useAuthStore.getState().user?.role?.toLowerCase() === "student";
    const [attendanceRes, invoicesRes, subsRes, liveRes, lecturesRes, assignmentsRes, issuesRes, announcementsRes, unreadRes] =
      await Promise.allSettled([
        isStudent
          ? httpClient.get("api/student/attendance-summary/").then((r) => r.data)
          : Promise.resolve(null),
        feeApi.getInvoices(),
        httpClient.get("api/bus/subscriptions/").then((r) => asList(r.data)),
        httpClient.get("api/bus/live/").then((r) => asList(r.data)),
        attendanceApi.getLectures().then(asList),
        httpClient.get("api/assignments/").then((r) => asList(r.data)),
        libraryApi.getMyIssuedBooks().then(asList),
        httpClient.get("api/announcements/").then((r) => asList(r.data)),
        notificationsApi.unreadCount(),
      ]);

    const next: StudentDashboardData = { ...EMPTY };

    const att = valueOf(attendanceRes);
    if (att) {
      next.attendance = {
        percentage: att.percentage ?? null,
        minimumRequired: att.minimum_required ?? null,
        termName: att.term_name ?? null,
      };
    }

    const invoices = valueOf(invoicesRes);
    if (invoices) {
      const open = invoices.filter((i) => i.status !== "paid" && Number(i.remaining_balance) > 0);
      const dueDates = open.map((i) => i.due_date).sort();
      next.fees = {
        totalDue: open.reduce((sum, i) => sum + Number(i.remaining_balance || 0), 0),
        nextDueDate: dueDates[0] ?? null,
      };
    }

    const subs = valueOf(subsRes);
    const activeSub = subs?.find((s: any) => s.status === "active" && s.is_valid !== false);
    if (activeSub) {
      const live = valueOf(liveRes)?.find((b: any) => b.route?.id === activeSub.route && b.is_live);
      next.bus = {
        routeName: activeSub.route_name,
        boardingStop: activeSub.boarding_stop || null,
        isLive: !!live,
        distanceKm: live ? Number(live.distance_km) : null,
      };
    }

    const lectures = valueOf(lecturesRes);
    if (lectures) {
      const upcoming = lectures
        .map((l: any) => ({ ...l, _start: new Date(l.start_time), _end: new Date(l.end_time) }))
        .filter((l: any) => !isNaN(l._start.getTime()) && l._end > now)
        .sort((a: any, b: any) => a._start.getTime() - b._start.getTime())[0];
      if (upcoming) {
        next.nextLecture = {
          title: upcoming.subject || upcoming.name,
          room: upcoming.classroom_name || null,
          teacher: upcoming.teacher_name || null,
          start: upcoming._start,
          end: upcoming._end,
        };
      }
    }

    const assignments = valueOf(assignmentsRes);
    if (assignments) {
      next.assignmentsDueThisWeek = assignments.filter((a: any) => {
        const due = new Date(a.due_date).getTime();
        return due >= now.getTime() && due - now.getTime() <= WEEK_MS;
      }).length;
    }

    const issues = valueOf(issuesRes);
    if (issues) {
      const out = issues.filter((i: any) => !i.returned_date);
      next.libraryDueBack = out.length;
      next.libraryOverdue = out.filter((i: any) => new Date(i.due_date) < now).length;
    }

    const announcements = valueOf(announcementsRes);
    if (announcements) {
      next.newAnnouncements = announcements.filter(
        (a: any) => now.getTime() - new Date(a.created_at).getTime() <= WEEK_MS
      ).length;
    }

    next.unreadNotifications = valueOf(unreadRes) ?? 0;

    setData(next);
    setLoading(false);
  }, []);

  // Refetch whenever the dashboard regains focus (e.g. after paying a fee).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { data, loading, reload: load };
}
