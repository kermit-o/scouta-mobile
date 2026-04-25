import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/lib/constants";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text
          style={{
            color: Colors.text,
            fontSize: 24,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Reset Password
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Enter your email and we will send you a reset link.
        </Text>

        {sent ? (
          <View
            style={{
              backgroundColor: "rgba(74,154,74,0.1)",
              borderWidth: 1,
              borderColor: Colors.green,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: Colors.green,
                fontSize: 14,
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Reset link sent! Check your email inbox.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              backgroundColor: "rgba(238,68,68,0.1)",
              borderWidth: 1,
              borderColor: Colors.red,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <Text
          style={{
            color: Colors.textSecondary,
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: 1,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          EMAIL
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: Colors.inputBg,
            borderWidth: 1,
            borderColor: Colors.inputBorder,
            borderRadius: 8,
            padding: 14,
            color: Colors.text,
            fontSize: 15,
            marginBottom: 24,
          }}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || sent}
          style={{
            backgroundColor: sent ? Colors.textMuted : Colors.green,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text
              style={{
                color: Colors.white,
                fontSize: 15,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              SEND RESET LINK
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, alignItems: "center" }}
        >
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
            Back to{" "}
            <Text style={{ color: Colors.green, fontWeight: "600" }}>
              Sign in
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
