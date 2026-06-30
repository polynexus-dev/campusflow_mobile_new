import httpClient from "@services/api/httpClient";

export interface FeeInvoice {
  id: number;
  invoice_number: string;
  due_date: string;
  total_amount: string;
  discount_amount: string;
  paid_amount: string;
  remaining_balance: string;
  status: "unpaid" | "partially_paid" | "paid";
  created_at: string;
}

export interface FeePaymentReceipt {
  id: number;
  receipt_number: string;
  amount_paid: string;
  payment_method: string;
  payment_date: string;
  transaction_reference: string;
  remarks: string;
  invoice_number: string;
}

export const feeApi = {
  getInvoices: async (): Promise<FeeInvoice[]> => {
    const res = await httpClient.get("api/fees/invoices/");
    return res.data;
  },

  getPayments: async (): Promise<FeePaymentReceipt[]> => {
    const res = await httpClient.get("api/fees/payments/");
    return res.data;
  },
};
