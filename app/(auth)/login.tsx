import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, API_BASE } from "@/lib/constants";
import { login as apiLogin } from "@/lib/api";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiLogin(email.trim(), password);
      if (!res?.token) {
        setError("Login failed: no token returned");
        return;
      }
      await setSession(res.token, res.user ?? null);
      router.replace("/(app)");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL("auth/callback");
      const authUrl = `${API_BASE}/auth/google?redirect_mobile=1&redirect_uri=${encodeURIComponent(
        redirectUrl
      )}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
        showInRecents: true,
      });

      if (result.type !== "success" || !result.url) {
        return;
      }

      const url = new URL(result.url);
      const token = url.searchParams.get("token");
      const userParam = url.searchParams.get("user");
      const userId = url.searchParams.get("user_id");
      const username = url.searchParams.get("username");
      const displayName = url.searchParams.get("display_name");
      const avatarUrl = url.searchParams.get("avatar_url");

      if (!token) {
        setError("Google login failed - no token received");
        return;
      }

      let user = null;
      if (userParam) {
        try {
          user = JSON.parse(decodeURIComponent(userParam));
        } catch {}
      }
      if (!user && userId) {
        user = {
          id: Number(userId),
          username: username || "",
          display_name: displayName || "",
          avatar_url: avatarUrl || "",
        };
      }

      await setSession(token, user);
      router.replace("/(app)");
    } catch (e: any) {
      setError(e?.message || "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ color: Colors.text, fontSize: 32, fontWeight: "700" }}>SCOUTA</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 3, marginTop: 8 }}>AI DEBATES</Text>
        </View>

        {error ? (
          <Text style={{ color: Colors.red, fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 16 }}>{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={googleLoading || loading}
          style={{
            backgroundColor: "#fff", padding: 14, alignItems: "center", borderRadius: 8,
            flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20,
            opacity: googleLoading || loading ? 0.6 : 1,
          }}
        >
          {googleLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#4285F4" }}>G</Text>
              <Text style={{ color: "#333", fontSize: 14, fontWeight: "600" }}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: "monospace", marginHorizontal: 12 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        </View>

        <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading && !googleLoading}
          style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 15, fontFamily: "monospace", marginBottom: 16 }}
        />

        <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          editable={!loading && !googleLoading}
          style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 15, fontFamily: "monospace", marginBottom: 8 }}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: 24 }}>
            <Text style={{ color: Colors.blue, fontSize: 11, fontFamily: "monospace" }}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading || googleLoading || !email.trim() || !password.trim()}
          style={{
            backgroundColor: Colors.green, padding: 16, alignItems: "center", borderRadius: 8,
            opacity: loading || googleLoading || !email.trim() || !password.trim() ? 0.5 : 1,
          }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>No account?</Text>
          <Link href="/(auth)/register">
            <Text style={{ color: Colors.green, fontSize: 12, fontFamily: "monospace" }}>Sign up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
