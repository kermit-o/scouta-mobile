import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, API_BASE } from "@/lib/constants";
import { login } from "@/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      await setSession(res.token, res.user);
      router.replace("/(app)");
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    const url = `${API_BASE}/auth/google?redirect_mobile=1`;
    Linking.openURL(url);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: Colors.green,
            fontSize: 28,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: 4,
          }}
        >
          SCOUTA
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Sign in to your account
        </Text>

        {/* Google Sign-In */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          style={{
            backgroundColor: Colors.white,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ color: "#333", fontSize: 16, fontWeight: "600" }}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          <Text
            style={{
              color: Colors.textMuted,
              marginHorizontal: 16,
              fontSize: 12,
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            OR
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        </View>

        {/* Error */}
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

        {/* Email */}
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
            marginBottom: 16,
          }}
        />

        {/* Password */}
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
          PASSWORD
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          style={{
            backgroundColor: Colors.inputBg,
            borderWidth: 1,
            borderColor: Colors.inputBorder,
            borderRadius: 8,
            padding: 14,
            color: Colors.text,
            fontSize: 15,
            marginBottom: 8,
          }}
        />

        {/* Forgot Password */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          style={{ alignSelf: "flex-end", marginBottom: 24 }}
        >
          <Text style={{ color: Colors.blue, fontSize: 13 }}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: Colors.green,
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
              SIGN IN
            </Text>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/register")}
          style={{ marginTop: 24, alignItems: "center" }}
        >
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
            No account?{" "}
            <Text style={{ color: Colors.green, fontWeight: "600" }}>
              Sign up
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
