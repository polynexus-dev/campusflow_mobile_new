import httpClient from "@services/api/httpClient";

export interface Payslip {
  id: number;
  month: number;
  year: number;
  total_working_days: number;
  present_days: number;
  leave_days: number;
  absent_days: number;
  gross_salary: string;
  total_deductions: string;
  pf_deduction: string;
  esi_deduction: string;
  tds_deduction: string;
  absence_deduction: string;
  net_payable: string;
  status: string;
  generated_on: string;
}

export const payrollApi = {
  // Always the caller's own payslips — `mine` stops the backend returning
  // every employee's payslip when the caller is a College Admin.
  getPayslips: async (params?: { year?: number }): Promise<Payslip[]> => {
    const response = await httpClient.get("/payroll/payslips/", { params: { ...params, mine: 1 } });
    return response.data;
  },

  getSalaryStructure: async (userId: number | string) => {
    const response = await httpClient.get(`/payroll/structures/${userId}/`);
    return response.data;
  },
};
