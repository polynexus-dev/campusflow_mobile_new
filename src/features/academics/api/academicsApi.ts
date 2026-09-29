import httpClient from "@services/api/httpClient";

export interface CourseAward {
  id: number;
  course_code: string;
  course_name: string;
  credits: number;
  total_marks: number | null;
  max_marks: number | null;
  grade_letter: string;
  grade_points: number;
  is_pass: boolean;
  attempt_number: number;
}

export interface TermSheet {
  id: number;
  term_name: string;
  academic_year_name: string;
  semester_number: number | null;
  credits_registered: number;
  credits_earned: number;
  sgpa: number | null;
  backlog_count: number;
  result_status: string;
  courses: CourseAward[];
}

export interface Transcript {
  student_id: string;
  cgpa: number | null;
  credits_earned: number;
  active_backlog_count: number;
  highest_semester_cleared: number;
  terms: TermSheet[];
}

export interface ClearanceItem {
  id: number;
  desk_name: string;
  status: string;
  remarks: string | null;
  cleared_by_name: string | null;
  cleared_at: string | null;
}

export interface ClearanceStatus {
  is_cleared: boolean;
  cycle_type: string;
  request: {
    id: number;
    status: string;
    term_name: string | null;
    academic_year_name: string | null;
    items: ClearanceItem[];
    completed_at: string | null;
  } | null;
}

export interface ClearanceCertificate {
  student_id: string;
  student_name: string;
  department: string | null;
  cleared_on: string;
  desks: { desk: string; cleared_by: string | null; cleared_at: string | null; remarks: string | null }[];
}

export const academicsApi = {
  // Only published term grade sheets are returned.
  getMyTranscript: async (): Promise<Transcript> => {
    const response = await httpClient.get("api/academics/my-transcript/");
    return response.data;
  },

  getMyClearance: async (cycle: "periodic" | "final_exit"): Promise<ClearanceStatus> => {
    const response = await httpClient.get("api/clearance/me/status/", { params: { cycle } });
    return response.data;
  },

  // 404s until a final-exit clearance is fully cleared.
  getMyClearanceCertificate: async (): Promise<ClearanceCertificate> => {
    const response = await httpClient.get("api/clearance/me/certificate/");
    return response.data;
  },
};
