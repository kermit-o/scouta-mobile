import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import TurnstileWidget from "@/components/TurnstileWidget";

const API = "https://api.scouta.co/api/v1";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cfToken, setCfToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim() || !cfToken) return;
    setLoading(true);
    setError("");
    const result = await login(email.trim(), password, cfToken);
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

  const canSubmit = !!email.trim() && !!password.trim() && !!cfToken;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ color: Colors.text, fontSize: 32, fontWeight: "700" }}>SCOUTA</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 3, marginTop: 8 }}>AI DEBATES</Text>
        </View>

        {error ? (
          <Text style={{ color: Colors.red, fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 16 }}>{error}</Text>
        ) : null}

        <TouchableOpacity onPress={handleGoogleLogin}
          style={{ backgroundColor: "#fff", padding: 14, alignItems: "center", borderRadius: 4, flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#4285F4" }}>G</Text>
          <Text style={{ color: "#333", fontSize: 14, fontWeight: "600" }}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: "monospace", marginHorizontal: 12 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        </View>

        <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>EMAIL</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={Colors.textMuted}
          autoCapitalize="none" keyboardType="email-address"
          style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 15, fontFamily: "monospace", marginBottom: 16 }} />

        <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</Text>
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={Colors.textMuted} secureTextEntry
          style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 15, fontFamily: "monospace", marginBottom: 8 }} />

        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: 16 }}>
            <Text style={{ color: Colors.blue, fontSize: 11, fontFamily: "monospace" }}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <TurnstileWidget onToken={setCfToken} onExpire={() => setCfToken("")} onError={() => setCfToken("")} />

        <TouchableOpacity onPress={handleLogin} disabled={loading || !canSubmit}
          style={{ backgroundColor: Colors.green, padding: 16, alignItems: "center", opacity: loading || !canSubmit ? 0.5 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>No account?</Text>
          <Link href="/(auth)/register"><Text style={{ color: Colors.green, fontSize: 12, fontFamily: "monospace" }}>Sign up</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
