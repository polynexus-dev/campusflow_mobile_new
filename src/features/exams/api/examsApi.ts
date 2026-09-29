import httpClient from "@services/api/httpClient";

export interface Exam {
  id: number;
  name: string;
  exam_type: string;
  course: string | null;
  course_code: string | null;
  date: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  total_marks: number;
  passing_marks: number;
  semester: string | null;
  status: string;
  instructions: string | null;
  results_published: boolean;
  is_clearance_blocked: boolean;
  is_detained: boolean;
}

export interface ExamResult {
  id: number;
  exam: number;
  exam_name: string;
  course_name: string;
  marks_obtained: string;
  total_marks: number;
  percentage: number | null;
  grade: string | null;
  is_pass: boolean;
  remarks: string | null;
  semester: string | null;
}

export const examsApi = {
  getExams: async (params?: { department?: number; status?: string; exam_type?: number }): Promise<Exam[]> => {
    const response = await httpClient.get("/exams/", { params });
    return response.data;
  },

  getExamDetails: async (id: number | string) => {
    const response = await httpClient.get(`/exams/${id}/`);
    return response.data;
  },

  // The backend scopes this to the logged-in student's own results.
  getMyResults: async (): Promise<ExamResult[]> => {
    const response = await httpClient.get("api/exam-results/");
    const data = response.data;
    return Array.isArray(data) ? data : data?.results || [];
  },
};
