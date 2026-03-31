import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from "react-native";
import { useRouter } from "expo-router";
import { startStream } from "@/lib/api";
import { Colors, Fonts } from "@/lib/constants";

const ACCESS_TYPES = [
  { value: "password", label: "🔑 Password" },
  { value: "invite_only", label: "✉️ Invite Only" },
  { value: "paid", label: "🪙 Paid" },
  { value: "followers", label: "👥 Followers" },
  { value: "subscribers", label: "⭐ Subscribers" },
  { value: "vip", label: "💎 VIP" },
];

export default function GoLiveScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessType, setAccessType] = useState("password");
  const [password, setPassword] = useState("");
  const [entryCost, setEntryCost] = useState("");
  const [maxViewers, setMaxViewers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    const opts: any = {};
    if (isPrivate) {
      opts.is_private = true;
      opts.access_type = accessType;
      if (accessType === "password") opts.password = password;
      if (accessType === "paid") opts.entry_coin_cost = parseInt(entryCost) || 0;
      if (maxViewers) opts.max_viewer_limit = parseInt(maxViewers) || 0;
    }
    try {
      const data = await startStream(title.trim(), description.trim(), opts);
      if (data.room_name) {
        router.replace(`/(app)/live/${data.room_name}`);
      } else {
        setError(data.detail || "Failed to start");
      }
    } catch { setError("Network error"); }
    setLoading(false);
  }

  const inputStyle = { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 12, fontFamily: "monospace" as const, fontSize: 14, marginBottom: 12 };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 16 }}>{"< Back"}</Text>
      </TouchableOpacity>

      <Text style={{ color: Colors.red, fontSize: 10, fontFamily: Fonts.mono, letterSpacing: 2, marginBottom: 4 }}>GO LIVE</Text>
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 24 }}>Start a Live Stream</Text>

      {error ? <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>TITLE *</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="What are you debating today?" placeholderTextColor={Colors.textMuted} style={inputStyle} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>DESCRIPTION</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="Optional" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} style={{ ...inputStyle, textAlignVertical: "top", minHeight: 70 }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, padding: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
        <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: Colors.gold }} />
        <Text style={{ color: Colors.text, fontFamily: Fonts.mono, fontSize: 13 }}>🔒 Private Room</Text>
      </View>

      {isPrivate && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>ACCESS TYPE</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {ACCESS_TYPES.map(at => (
              <TouchableOpacity key={at.value} onPress={() => setAccessType(at.value)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: accessType === at.value ? Colors.green + "22" : Colors.card, borderWidth: 1, borderColor: accessType === at.value ? Colors.green : Colors.border }}>
                <Text style={{ color: accessType === at.value ? Colors.green : Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11 }}>{at.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {accessType === "password" && (
            <TextInput value={password} onChangeText={setPassword} placeholder="Room password" placeholderTextColor={Colors.textMuted} secureTextEntry style={{ ...inputStyle, marginTop: 12 }} />
          )}
          {accessType === "paid" && (
            <TextInput value={entryCost} onChangeText={t => setEntryCost(t.replace(/\D/g, ""))} placeholder="Coin cost" placeholderTextColor={Colors.textMuted} keyboardType="numeric" style={{ ...inputStyle, marginTop: 12 }} />
          )}
          <TextInput value={maxViewers} onChangeText={t => setMaxViewers(t.replace(/\D/g, ""))} placeholder="Max viewers (0 = unlimited)" placeholderTextColor={Colors.textMuted} keyboardType="numeric" style={{ ...inputStyle, marginTop: 8 }} />
        </View>
      )}

      <TouchableOpacity onPress={handleStart} disabled={loading || !title.trim()}
        style={{ backgroundColor: Colors.red, padding: 16, alignItems: "center", opacity: loading || !title.trim() ? 0.5 : 1 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 13, letterSpacing: 1 }}>{isPrivate ? "🔒 START PRIVATE LIVE" : "⏺ START LIVE"}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
