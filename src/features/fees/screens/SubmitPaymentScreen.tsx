import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";

export const SubmitPaymentScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const title = (params.title as string) || "Tuition · Semester 5";
  const invoiceNum = (params.invoiceNum as string) || "INV-2071";
  const amount = (params.amount as string) || "₹18,000";

  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");

  // Dynamically configure breakdown list based on invoice total
  let breakdownItems = [
    { label: "Tuition fee", value: "₹16,000" },
    { label: "Development fund", value: "₹1,500" },
    { label: "Exam registration", value: "₹500" }
  ];
  let totalVal = "₹18,000";

  if (amount === "₹6,500" || invoiceNum === "INV-2066") {
    breakdownItems = [
      { label: "Lab fee", value: "₹5,000" },
      { label: "Library deposit", value: "₹1,500" }
    ];
    totalVal = "₹6,500";
  } else if (amount === "₹24,500" || invoiceNum === "INV-2071, INV-2066") {
    breakdownItems = [
      { label: "Tuition fee", value: "₹16,000" },
      { label: "Development fund", value: "₹1,500" },
      { label: "Exam registration", value: "₹500" },
      { label: "Lab & Library fee", value: "₹6,500" }
    ];
    totalVal = "₹24,500";
  }

  const handlePayPress = () => {
    Alert.alert(
      "Payment Successful",
      `Your payment of ${totalVal} has been processed successfully. Receipt REC-${invoiceNum.split("-")[1] || "2071"} has been emailed to you.`,
      [
        {
          text: "OK",
          onPress: () => {
            router.back();
          }
        }
      ]
    );
  };

  return (
    <ScreenWrapper
      title="Pay invoice"
      showHeader={true}
      showBack={true}
      scrollable={true}
      screenBgColor="#F8FAFC"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingBottom: 40,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Subtitle Section */}
      <View className="mb-6">
        <Text className="text-[14px] font-semibold text-slate-400">
          {title} · {invoiceNum}
        </Text>
      </View>

      {/* Breakdown Card */}
      <View className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm mb-4">
        <Text className="text-slate-400 text-[11px] font-black tracking-widest uppercase mb-4">BREAKDOWN</Text>
        
        <View className="gap-3">
          {breakdownItems.map((item, idx) => (
            <View key={idx} className="flex-row justify-between items-center pb-2 border-b border-slate-50">
              <Text className="text-slate-500 text-[14px] font-semibold">{item.label}</Text>
              <Text className="text-slate-800 text-[14px] font-bold">{item.value}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row justify-between items-center pt-4 mt-2 border-t border-slate-100">
          <Text className="text-slate-800 text-[15px] font-extrabold">Total</Text>
          <Text className="text-slate-900 text-[17px] font-black">{totalVal}</Text>
        </View>
      </View>

      {/* Pay With Card */}
      <View className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm mb-6">
        <Text className="text-slate-400 text-[11px] font-black tracking-widest uppercase mb-4">PAY WITH</Text>

        <View className="gap-3">
          {/* UPI Option */}
          <TouchableOpacity
            onPress={() => setSelectedMethod("upi")}
            activeOpacity={0.9}
            className={`flex-row items-center border rounded-2xl p-4 ${selectedMethod === "upi" ? "border-[#5D1E62] border-2 bg-purple-50/5" : "border-slate-100"}`}
          >
            {selectedMethod === "upi" ? (
              <View className="w-5.5 h-5.5 rounded-full border-2 border-[#5D1E62] justify-center items-center">
                <View className="w-3 h-3 rounded-full bg-[#5D1E62]" />
              </View>
            ) : (
              <View className="w-5.5 h-5.5 rounded-full border border-slate-300" />
            )}
            <View className="flex-1 ml-3">
              <Text className="text-slate-800 text-[14px] font-extrabold">UPI</Text>
              <Text className="text-slate-400 text-[12px] font-semibold mt-0.5">ananya@oksbi</Text>
            </View>
            <View className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
              <Text className="text-[10px] font-bold text-emerald-600">No fee</Text>
            </View>
          </TouchableOpacity>

          {/* Card Option */}
          <TouchableOpacity
            onPress={() => setSelectedMethod("card")}
            activeOpacity={0.9}
            className={`flex-row items-center border rounded-2xl p-4 ${selectedMethod === "card" ? "border-[#5D1E62] border-2 bg-purple-50/5" : "border-slate-100"}`}
          >
            {selectedMethod === "card" ? (
              <View className="w-5.5 h-5.5 rounded-full border-2 border-[#5D1E62] justify-center items-center">
                <View className="w-3 h-3 rounded-full bg-[#5D1E62]" />
              </View>
            ) : (
              <View className="w-5.5 h-5.5 rounded-full border border-slate-300" />
            )}
            <View className="flex-1 ml-3">
              <Text className="text-slate-800 text-[14px] font-extrabold">Debit / credit card</Text>
              <Text className="text-slate-400 text-[12px] font-semibold mt-0.5">Visa •••• 4821</Text>
            </View>
          </TouchableOpacity>

          {/* Netbanking Option */}
          <TouchableOpacity
            onPress={() => setSelectedMethod("netbanking")}
            activeOpacity={0.9}
            className={`flex-row items-center border rounded-2xl p-4 ${selectedMethod === "netbanking" ? "border-[#5D1E62] border-2 bg-purple-50/5" : "border-slate-100"}`}
          >
            {selectedMethod === "netbanking" ? (
              <View className="w-5.5 h-5.5 rounded-full border-2 border-[#5D1E62] justify-center items-center">
                <View className="w-3 h-3 rounded-full bg-[#5D1E62]" />
              </View>
            ) : (
              <View className="w-5.5 h-5.5 rounded-full border border-slate-300" />
            )}
            <View className="flex-1 ml-3">
              <Text className="text-slate-800 text-[14px] font-extrabold">Net banking</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Secured gateway indicator */}
      <View className="flex-row justify-center items-center gap-1.5 mb-6">
        <Feather name="lock" size={13} color="#10b981" />
        <Text className="text-slate-400 text-[11px] font-bold">Secured by the college payment gateway · 256–bit</Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        onPress={handlePayPress}
        activeOpacity={0.9}
        className="bg-[#5D1E62] rounded-2xl py-4 items-center shadow-md shadow-purple-900"
      >
        <Text className="text-white font-black text-[15px]">Pay {totalVal}</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
};

export default SubmitPaymentScreen;
