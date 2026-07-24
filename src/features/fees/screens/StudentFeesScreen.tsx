import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { feeApi, FeeInvoice, FeePaymentReceipt } from "../services/feeApi";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { ROUTES } from "@/constants/route";

export const StudentFeesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "due" | "paid">("all");
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [payments, setPayments] = useState<FeePaymentReceipt[]>([]);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invs, pmts] = await Promise.all([
        feeApi.getInvoices(),
        feeApi.getPayments(),
      ]);
      setInvoices(invs);
      setPayments(pmts);
    } catch (err: any) {
      console.error("Failed to load fee information:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayNow = async (invoiceId: number) => {
    setPayingInvoiceId(invoiceId);
    try {
      const order = await feeApi.createOrder(invoiceId);
      if (!order.key_id) {
        Alert.alert("Payments Unavailable", "Online payments are not configured for your college yet.");
        return;
      }
      router.push({
        pathname: ROUTES.APP.PAY_INVOICE,
        params: {
          transactionId: String(order.transaction_id),
          keyId: order.key_id,
          orderId: order.order_id,
          amount: order.total_amount,
          currency: order.currency,
        },
      });
    } catch (err: any) {
      Alert.alert("Could Not Start Payment", err.message || "Please try again.");
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handlePayMockItem = (title: string, amountStr: string, invoiceNum: string) => {
    router.push({
      pathname: ROUTES.APP.SUBMIT_PAYMENT,
      params: {
        title,
        amount: amountStr,
        invoiceNum,
      },
    });
  };

  const handleViewReceipt = (title: string, invoiceNum: string, amount: string) => {
    const realPayment = payments.find(p => p.invoice_number === invoiceNum);
    if (realPayment) {
      Alert.alert(
        "Receipt Details",
        `Receipt: ${realPayment.receipt_number}\nAmount Paid: ₹${realPayment.amount_paid}\nMethod: ${realPayment.payment_method.toUpperCase()}\nDate: ${new Date(realPayment.payment_date).toLocaleDateString()}\nRef ID: ${realPayment.transaction_reference || "N/A"}`,
        [{ text: "Close", style: "cancel" }]
      );
    } else {
      Alert.alert(
        "Receipt Details",
        `Item: ${title}\nReceipt: REC-${invoiceNum.split("-")[1] || "2066"}\nAmount Paid: ${amount}\nMethod: UPI\nDate: ${new Date().toLocaleDateString()}\nRef: CF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        [{ text: "Close", style: "cancel" }]
      );
    }
  };

  const mockInvoices = [
    {
      id: 1,
      title: "Tuition · Semester 5",
      amount: "₹18,000",
      dueDateStr: "Due 20 Jul · INV-2071",
      invoiceNum: "INV-2071",
      status: "due_soon",
    },
    {
      id: 2,
      title: "Lab & Library",
      amount: "₹6,500",
      dueDateStr: "Was due 30 Jun · INV-2066",
      invoiceNum: "INV-2066",
      status: "overdue",
    },
    {
      id: 3,
      title: "Hostel · Q2",
      amount: "₹42,000",
      dueDateStr: "Paid 02 Jul · ",
      invoiceNum: "INV-1904",
      status: "paid",
      paymentDateStr: "Paid 02 Jul",
    },
    {
      id: 4,
      title: "Exam registration",
      amount: "₹1,200",
      dueDateStr: "Paid 14 Jun · ",
      invoiceNum: "INV-1891",
      status: "paid",
      paymentDateStr: "Paid 14 Jun",
    },
  ];

  const filteredItems = mockInvoices.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "due") return item.status === "due_soon" || item.status === "overdue";
    if (activeTab === "paid") return item.status === "paid";
    return true;
  });

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#5D1E62" />
      </View>
    );
  }

  return (
    <ScreenWrapper
      title="Fees"
      showHeader={true}
      showBack={true}
      scrollable={true}
      screenBgColor="#F8FAFC"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingBottom: 40,
      }}
    >
      {/* Header section */}
      <View className="mb-6">
        <Text className="text-[14px] font-semibold text-slate-400">Academic year 2026–27</Text>
      </View>

      {/* Total Outstanding Card */}
      <View className="relative overflow-hidden bg-[#5D1E62] rounded-3xl p-6 mb-6 shadow-md">
        {/* Radial concentric circle pattern overlays */}
        <View className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/[0.04] border border-white/[0.04]" />
        <View className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/[0.04] border border-white/[0.06]" />
        <View className="absolute -right-0 -top-0 w-24 h-24 rounded-full bg-white/[0.05] border border-white/[0.08]" />

        <Text className="text-white/80 text-[11px] font-black tracking-widest uppercase">TOTAL OUTSTANDING</Text>
        {payingInvoiceId !== null ? (
          <ActivityIndicator size="small" color="#FFFFFF" className="mt-3 self-start" />
        ) : (
          <Text className="text-white text-[32px] font-black mt-2 tracking-tight">₹24,500</Text>
        )}
        <Text className="text-white/60 text-[12px] font-bold mt-1">2 invoices · next due 20 Jul</Text>

        <View className="flex-row mt-6 gap-3 items-center">
          <TouchableOpacity 
            onPress={() => handlePayMockItem("All Outstanding Invoices", "₹24,500", "INV-2071")}
            activeOpacity={0.9}
            className="bg-white px-6 py-3 rounded-full shadow-sm"
          >
            <Text className="text-[#5D1E62] font-black text-[13px]">Pay all</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab("paid")}
            activeOpacity={0.8}
            className="px-4 py-3 justify-center"
          >
            <Text className="text-white/95 font-black text-[13px]">Payment history</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs segment control capsule */}
      <View className="flex-row bg-slate-100 p-1.5 rounded-3xl mb-6">
        <TouchableOpacity
          key="tab-all"
          onPress={() => setActiveTab("all")}
          activeOpacity={0.9}
          className={`flex-1 py-2.5 rounded-3xl items-center ${activeTab === "all" ? "bg-white shadow-sm" : "bg-transparent shadow-none"}`}
        >
          <Text className={`text-[13px] font-black ${activeTab === "all" ? "text-slate-800" : "text-slate-400"}`}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          key="tab-due"
          onPress={() => setActiveTab("due")}
          activeOpacity={0.9}
          className={`flex-1 py-2.5 rounded-3xl items-center ${activeTab === "due" ? "bg-white shadow-sm" : "bg-transparent shadow-none"}`}
        >
          <Text className={`text-[13px] font-black ${activeTab === "due" ? "text-slate-800" : "text-slate-400"}`}>Due</Text>
        </TouchableOpacity>
        <TouchableOpacity
          key="tab-paid"
          onPress={() => setActiveTab("paid")}
          activeOpacity={0.9}
          className={`flex-1 py-2.5 rounded-3xl items-center ${activeTab === "paid" ? "bg-white shadow-sm" : "bg-transparent shadow-none"}`}
        >
          <Text className={`text-[13px] font-black ${activeTab === "paid" ? "text-slate-800" : "text-slate-400"}`}>Paid</Text>
        </TouchableOpacity>
      </View>

      {/* Invoices List */}
      <View className="gap-3">
        {filteredItems.map((item) => {
          const isPaid = item.status === "paid";
          const isOverdue = item.status === "overdue";
          const isDueSoon = item.status === "due_soon";

          return (
            <TouchableOpacity
              key={item.id}
              disabled={isPaid || payingInvoiceId !== null}
              onPress={() => handlePayMockItem(item.title, item.amount, item.invoiceNum)}
              activeOpacity={0.9}
              className="bg-white rounded-[20px] p-5 rounded-lg border border-slate-100 shadow-sm flex-row items-center justify-between"
            >
              <View className="flex-1 mr-4">
                <Text className="text-slate-800 text-[15px] font-extrabold" numberOfLines={1}>{item.title}</Text>
                
                {isPaid ? (
                  <View className="flex-row items-center mt-1 flex-wrap">
                    <Text className="text-slate-400 text-[12px] font-semibold">{item.paymentDateStr} · </Text>
                    <TouchableOpacity onPress={() => handleViewReceipt(item.title, item.invoiceNum, item.amount)}>
                      <Text className="text-[#5D1E62] text-[12px] font-extrabold">View receipt</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text className="text-slate-400 text-[12px] font-semibold mt-1" numberOfLines={1}>
                    {item.dueDateStr}
                  </Text>
                )}
              </View>

              <View className="items-end">
                <Text className="text-slate-800 text-[16px] font-black">
                  {payingInvoiceId === item.id ? (
                    <ActivityIndicator size="small" color="#5D1E62" />
                  ) : (
                    item.amount
                  )}
                </Text>
                {isDueSoon && (
                  <View className="bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-0.5 mt-2">
                    <Text className="text-[11px] font-bold text-orange-600">Due soon</Text>
                  </View>
                )}
                {isOverdue && (
                  <View className="bg-red-50 border border-red-100 rounded-lg px-2.5 py-0.5 mt-2">
                    <Text className="text-[11px] font-bold text-red-600">Overdue</Text>
                  </View>
                )}
                {isPaid && (
                  <View className="bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-0.5 mt-2">
                    <Text className="text-[11px] font-bold text-emerald-600">Paid</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredItems.length === 0 && (
          <Text className="text-center text-slate-400 text-[13px] mt-10">No records found for this tab.</Text>
        )}
      </View>
    </ScreenWrapper>
  );
};

export default StudentFeesScreen;
