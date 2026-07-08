import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { feeApi } from "../services/feeApi";

export const PaymentCheckoutScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transactionId: string;
    keyId: string;
    orderId: string;
    amount: string;
    currency: string;
  }>();

  const [verifying, setVerifying] = useState(false);

  const checkoutHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body style="margin:0;background:#F8FAFC;">
        <script>
          function post(payload) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
          var options = {
            key: ${JSON.stringify(params.keyId)},
            amount: ${JSON.stringify(params.amount)},
            currency: ${JSON.stringify(params.currency)},
            order_id: ${JSON.stringify(params.orderId)},
            name: "CampusFlow Fees",
            handler: function (response) {
              post({ type: "success", ...response });
            },
            modal: {
              ondismiss: function () {
                post({ type: "cancelled" });
              },
            },
          };
          var rzp = new Razorpay(options);
          rzp.on("payment.failed", function (response) {
            post({ type: "failed", error: response.error });
          });
          rzp.open();
        </script>
      </body>
    </html>
  `;

  const handleMessage = async (event: WebViewMessageEvent) => {
    let data: any;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (data.type === "cancelled") {
      router.back();
      return;
    }

    if (data.type === "failed") {
      Alert.alert("Payment Failed", data.error?.description || "The payment could not be completed.");
      router.back();
      return;
    }

    if (data.type === "success") {
      setVerifying(true);
      try {
        const result = await feeApi.verifyPayment({
          transaction_id: Number(params.transactionId),
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
        Alert.alert("Payment Successful", result.message, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } catch (err: any) {
        Alert.alert(
          "Verification Failed",
          err.message || "Payment was made but could not be verified. Contact your college admin with your payment receipt."
        );
        router.back();
      } finally {
        setVerifying(false);
      }
    }
  };

  return (
    <ScreenWrapper title="Complete Payment" showHeader showBack disablePadding style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: checkoutHtml }}
        onMessage={handleMessage}
        style={styles.webview}
      />
      {verifying && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PaymentCheckoutScreen;
