import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { startLiveStream } from "@/lib/api";

const ACCESS_TYPES = [
  "password",
  "invite_only",
  "paid",
  "followers",
  "subscribers",
  "vip",
] as const;
type AccessType = (typeof ACCESS_TYPES)[number];

export default function StartLiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>("password");
  const [password, setPassword] = useState("");
  const [coinCost, setCoinCost] = useState("");
  const [maxViewers, setMaxViewers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!token) {
      setError("You must be signed in to go live.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
      };
      if (isPrivate) {
        payload.access_type = accessType;
        if (accessType === "password") payload.password = password;
        if (accessType === "paid") payload.coin_cost = Number(coinCost) || 0;
        if (maxViewers) payload.max_viewers = Number(maxViewers);
      }

      const stream = await startLiveStream(payload, token);
      router.replace(`/(app)/live/${stream.room_name}`);
    } catch (e: any) {
      setError(e?.message || "Failed to start stream.");
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
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600" }}>
          Go Live
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
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

        <Text style={labelStyle}>STREAM TITLE *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What are you streaming?"
          placeholderTextColor={Colors.textMuted}
          style={inputStyle}
        />

        <Text style={labelStyle}>DESCRIPTION</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tell viewers what to expect..."
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
          style={{ ...inputStyle, minHeight: 80 }}
        />

        {/* Private toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: Colors.card,
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name={isPrivate ? "lock-closed" : "lock-open"}
              size={18}
              color={isPrivate ? Colors.gold : Colors.textMuted}
            />
            <Text style={{ color: Colors.text, fontSize: 15 }}>Private Room</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: Colors.border, true: Colors.green }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Private options */}
        {isPrivate ? (
          <View>
            <Text style={labelStyle}>ACCESS TYPE</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {ACCESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setAccessType(type)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      accessType === type ? Colors.gold : Colors.card,
                    borderWidth: 1,
                    borderColor:
                      accessType === type ? Colors.gold : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        accessType === type ? Colors.white : Colors.textSecondary,
                      fontSize: 12,
                      fontWeight: "600",
                      textTransform: "capitalize",
                    }}
                  >
                    {type.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {accessType === "password" ? (
              <>
                <Text style={labelStyle}>PASSWORD</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Set a room password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  style={inputStyle}
                />
              </>
            ) : null}

            {accessType === "paid" ? (
              <>
                <Text style={labelStyle}>COIN COST</Text>
                <TextInput
                  value={coinCost}
                  onChangeText={setCoinCost}
                  placeholder="e.g. 100"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  style={inputStyle}
                />
              </>
            ) : null}

            <Text style={labelStyle}>MAX VIEWERS (OPTIONAL)</Text>
            <TextInput
              value={maxViewers}
              onChangeText={setMaxViewers}
              placeholder="Leave empty for unlimited"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              style={inputStyle}
            />
          </View>
        ) : null}

        {/* Start button */}
        <TouchableOpacity
          onPress={handleStart}
          disabled={loading}
          style={{
            backgroundColor: Colors.red,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
            marginTop: 8,
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
              START LIVE
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
