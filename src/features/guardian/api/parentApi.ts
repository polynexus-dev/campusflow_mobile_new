import httpClient from "@services/api/httpClient";

// Guardian-only endpoints. The backend rejects any child not linked to the caller.

export interface ChildSummary {
  id: number;
  name: string;
  student_id: string;
  profile_picture: string | null;
  attendance_status: "Present" | "Absent" | "Leave";
  bus_tracking: { route_name: string; boarding_stop: string | null; is_live: boolean } | null;
  fee_due_banner: { has_dues: boolean; amount_due: number; due_date: string | null; message: string };
  unread_announcements_count: number;
}

export interface ChildAttendance {
  percentage: number | null;
  present_days: number;
  total_days_evaluated: number;
  calendar: { date: string; day_name: string; status: "Present" | "Absent" | "Leave" | "Holiday" }[];
}

export interface ChildFeeInvoice {
  id: number;
  invoice_number: string;
  due_date: string;
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  remaining_balance: number;
  status: string;
  payments: { receipt_number: string; amount_paid: number; payment_method: string; payment_date: string }[];
}

export interface ChildExams {
  exam_schedule: { id: number; subject_name: string; subject_code: string; exam_type: string; date: string; time: string; classroom: string }[];
  report_cards: {
    term_name: string;
    total_obtained: number;
    total_max: number;
    percentage: number;
    subjects: { subject_name: string; subject_code: string; marks_obtained: number; total_marks: number; grade: string; is_pass: boolean }[];
  }[];
}

export interface ChildAssignment {
  id: number;
  title: string;
  subject: string;
  due_date: string;
  teacher_name: string;
  submission_status: "Pending" | "Submitted" | "Graded";
  graded_marks: string | number | null;
  feedback: string | null;
}

export const parentApi = {
  getChildren: async (): Promise<ChildSummary[]> => {
    const res = await httpClient.get("api/parent/children/");
    return res.data.children || [];
  },

  // verification_key is the child's date of birth (YYYY-MM-DD) or admission number.
  linkChild: async (student_id: string, verification_key: string): Promise<string> => {
    const res = await httpClient.post("api/parent/children/link/", { student_id, verification_key });
    return res.data.message;
  },

  // Admin-reviewed fallback when the parent doesn't know the DOB / admission number.
  requestLink: async (student_code: string, contact_phone: string, claimed_relationship: string): Promise<void> => {
    await httpClient.post("api/parent-link-requests/", { student_code, contact_phone, claimed_relationship });
  },

  getAttendance: async (childId: number): Promise<ChildAttendance> =>
    (await httpClient.get(`api/parent/children/${childId}/attendance/`)).data,

  getFees: async (childId: number): Promise<ChildFeeInvoice[]> =>
    (await httpClient.get(`api/parent/children/${childId}/fees/`)).data.invoices || [],

  getExams: async (childId: number): Promise<ChildExams> =>
    (await httpClient.get(`api/parent/children/${childId}/exams/`)).data,

  getAssignments: async (childId: number): Promise<ChildAssignment[]> =>
    (await httpClient.get(`api/parent/children/${childId}/assignments/`)).data.assignments || [],
};
