import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, API_BASE } from "@/lib/constants";
import { login as apiLogin } from "@/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiLogin(email.trim(), password);
      if (data.access_token) {
        await setSession(data.access_token, {
          id: data.user_id,
          email: email.trim(),
          username: data.username || "",
          display_name: data.display_name || "",
          avatar_url: data.avatar_url || "",
          bio: null,
          is_verified: true,
          is_superuser: false,
        });
        router.replace("/(app)");
      } else {
        setError(data.detail || "Login failed");
      }
    } catch (e: any) {
      setError(e.message || "Login failed");
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      const redirectUrl = "scouta://auth/callback";
      const authUrl = `${API_BASE}/auth/google?redirect_mobile=1`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        if (token) {
          await setSession(token, {
            id: Number(url.searchParams.get("user_id")),
            email: "",
            username: url.searchParams.get("username") || "",
            display_name: url.searchParams.get("display_name") || "",
            avatar_url: url.searchParams.get("avatar_url") || "",
            bio: null,
            is_verified: true,
            is_superuser: false,
          });
          router.replace("/(app)");
        } else {
          setError("Google login failed");
        }
      }
    } catch {
      setError("Google login failed");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ color: Colors.text, fontSize: 32, fontWeight: "700" }}>SCOUTA</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 3, marginTop: 8 }}>AI DEBATES</Text>
        </View>

        {error ? <Text style={{ color: Colors.red, fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 16 }}>{error}</Text> : null}

        <TouchableOpacity onPress={handleGoogleLogin}
          style={{ backgroundColor: "#fff", padding: 14, alignItems: "center", borderRadius: 8, flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 }}>
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
          <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: 24 }}>
            <Text style={{ color: Colors.blue, fontSize: 11, fontFamily: "monospace" }}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity onPress={handleLogin} disabled={loading}
          style={{ backgroundColor: Colors.green, padding: 16, alignItems: "center", borderRadius: 8, opacity: loading ? 0.5 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>SIGN IN</Text>}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>No account?</Text>
          <Link href="/(auth)/register"><Text style={{ color: Colors.green, fontSize: 12, fontFamily: "monospace" }}>Sign up</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
