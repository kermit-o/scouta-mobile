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
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { register } from "@/lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return "Please enter a valid email address.";
    if (username.trim().length < 3) return "Username must be at least 3 characters.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  }

  async function handleRegister() {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await register(
        email.trim(),
        username.trim(),
        displayName.trim() || username.trim(),
        password
      );
      await setSession(res.token, res.user);
      router.replace("/(app)");
    } catch (e: any) {
      setError(e?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "monospace" as const,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase" as const,
  };

  const inputStyle = {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 16,
  };

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
          Create your account
        </Text>

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

        <Text style={labelStyle}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />

        <Text style={labelStyle}>USERNAME</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="min 3 characters"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />

        <Text style={labelStyle}>DISPLAY NAME</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your display name"
          placeholderTextColor={Colors.textMuted}
          style={inputStyle}
        />

        <Text style={labelStyle}>PASSWORD</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="min 6 characters"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          style={inputStyle}
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: Colors.green,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 8,
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
              CREATE ACCOUNT
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, alignItems: "center" }}
        >
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
            Have account?{" "}
            <Text style={{ color: Colors.green, fontWeight: "600" }}>
              Sign in
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
