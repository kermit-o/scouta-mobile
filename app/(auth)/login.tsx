import { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { Button, Field } from "@/components/ui";

const API = "https://api.scouta.co/api/v1";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      router.replace("/(app)");
    } else {
      setError(result.error || "Login failed");
    }
  }

  function handleGoogleLogin() {
    Linking.openURL(`${API}/auth/google?redirect_mobile=1`);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ color: Colors.text, fontSize: 32, fontWeight: "700" }}>SCOUTA</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 3, marginTop: 8 }}>AI DEBATES</Text>
        </View>

        {error ? (
          <Text style={{ color: Colors.red, fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 16 }}>{error}</Text>
        ) : null}

        <TouchableOpacity onPress={handleGoogleLogin}
          style={{ backgroundColor: "#fff", padding: 14, alignItems: "center", borderRadius: 4, flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <Ionicons name="logo-google" size={18} color="#4285F4" />
          <Text style={{ color: "#333", fontSize: 14, fontWeight: "600" }}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: "monospace", marginHorizontal: 12 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        </View>

        <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@email.com"
          autoCapitalize="none" keyboardType="email-address" />

        <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ marginBottom: 8 }} />

        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: 24 }}>
            <Text style={{ color: Colors.blue, fontSize: 11, fontFamily: "monospace" }}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <Button label="SIGN IN" onPress={handleLogin} loading={loading} disabled={!email.trim() || !password.trim()} />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>No account?</Text>
          <Link href="/(auth)/register"><Text style={{ color: Colors.green, fontSize: 12, fontFamily: "monospace" }}>Sign up</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
