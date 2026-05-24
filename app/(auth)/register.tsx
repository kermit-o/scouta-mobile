import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { Button, Field } from "@/components/ui";

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!email.trim() || !password.trim() || !username.trim()) return;
    setLoading(true);
    setError("");
    const result = await register(email.trim(), password, username.trim(), displayName.trim() || undefined);
    setLoading(false);
    if (result.ok) {
      router.replace("/(app)");
    } else {
      setError(result.error || "Registration failed");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: "700" }}>Create Account</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 2, marginTop: 8 }}>JOIN THE DEBATE</Text>
        </View>

        {error ? (
          <Text style={{ color: Colors.red, fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 16 }}>{error}</Text>
        ) : null}

        <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" />

        <Field label="USERNAME" value={username} onChangeText={setUsername} placeholder="your_handle" autoCapitalize="none" />

        <Field label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} placeholder="Your Name (optional)" />

        <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry />

        <Button label="CREATE ACCOUNT" onPress={handleRegister} loading={loading} disabled={!email.trim() || !password.trim() || !username.trim()} style={{ marginTop: 4 }} />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>Have an account?</Text>
          <Link href="/(auth)/login">
            <Text style={{ color: Colors.green, fontSize: 12, fontFamily: "monospace" }}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
