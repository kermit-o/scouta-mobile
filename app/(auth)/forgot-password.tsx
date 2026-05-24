import { useState } from "react";
import { View, Text } from "react-native";
import { Link } from "expo-router";
import { forgotPassword } from "@/lib/api";
import { Colors } from "@/lib/constants";
import { Button, Field } from "@/components/ui";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Failed to send email");
    }
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: Colors.bg }}>
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 8 }}>Reset Password</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace", marginBottom: 32 }}>
        We'll send you a link to reset your password.
      </Text>

      {sent ? (
        <View>
          <Text style={{ color: Colors.green, fontSize: 13, fontFamily: "monospace", marginBottom: 24 }}>
            Check your email for a reset link.
          </Text>
          <Link href="/(auth)/login">
            <Text style={{ color: Colors.blue, fontSize: 12, fontFamily: "monospace" }}>Back to login</Text>
          </Link>
        </View>
      ) : (
        <>
          {error ? <Text style={{ color: Colors.red, fontSize: 12, fontFamily: "monospace", marginBottom: 12 }}>{error}</Text> : null}
          <Field value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" />
          <Button label="SEND RESET LINK" onPress={handleSubmit} loading={loading} disabled={!email.trim()} />
          <Link href="/(auth)/login" style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>Back to login</Text>
          </Link>
        </>
      )}
    </View>
  );
}
