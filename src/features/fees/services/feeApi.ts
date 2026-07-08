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

export interface PaymentOrder {
  transaction_id: number;
  gateway: string;
  key_id: string | null;
  order_id: string;
  amount: string;
  convenience_fee_amount: string;
  total_amount: string;
  currency: string;
}

export interface PaymentVerifyResult {
  message: string;
  status: string;
  remaining_balance: string;
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

  createOrder: async (invoiceId: number): Promise<PaymentOrder> => {
    const res = await httpClient.post("api/payments/orders/", { invoice_id: invoiceId });
    return res.data;
  },

  verifyPayment: async (payload: {
    transaction_id: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<PaymentVerifyResult> => {
    const res = await httpClient.post("api/payments/verify/", payload);
    return res.data;
  },
};
