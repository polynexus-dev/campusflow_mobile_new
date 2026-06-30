import httpClient from "@services/api/httpClient";

export const payrollApi = {
  getPayslips: async () => {
    const response = await httpClient.get("/payroll/payslips/");
    return response.data;
  },

  getSalaryStructure: async (userId: number | string) => {
    const response = await httpClient.get(`/payroll/structures/${userId}/`);
    return response.data;
  }
};
