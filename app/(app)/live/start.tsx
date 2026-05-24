import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Fonts, API_BASE } from "@/lib/constants";
import { getToken } from "@/lib/auth";
import { BackButton, Button, Field } from "@/components/ui";

export default function GoLiveScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessType, setAccessType] = useState("password");
  const [password, setPassword] = useState("");
  const [entryCost, setEntryCost] = useState("");
  const [record, setRecord] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    if (!title.trim()) return;
    setLoading(true); setError("");
    try {
      const token = await getToken();
      const body: any = { title: title.trim(), description: description.trim(), record };
      if (isPrivate) {
        body.is_private = true; body.access_type = accessType;
        if (accessType === "password") body.password = password;
        if (accessType === "paid") body.entry_coin_cost = parseInt(entryCost) || 0;
      }
      const res = await fetch(`${API_BASE}/live/start`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.room_name) { router.replace(`/(app)/live/${data.room_name}`); }
      else { setError(data.detail || "Failed to start"); }
    } catch { setError("Network error"); }
    setLoading(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <BackButton style={{ marginBottom: 12 }} />
      <Text style={{ color: Colors.red, fontSize: 10, fontFamily: Fonts.mono, letterSpacing: 2, marginBottom: 4 }}>GO LIVE</Text>
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 24 }}>Start a Live Stream</Text>
      {error ? <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
      <Field label="TITLE *" value={title} onChangeText={setTitle} placeholder="What are you debating?" style={{ fontSize: 14 }} />
      <Field label="DESCRIPTION" value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} style={{ fontSize: 14, textAlignVertical: "top", minHeight: 70 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, padding: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
        <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: Colors.gold }} />
        <Text style={{ color: Colors.text, fontFamily: Fonts.mono, fontSize: 13 }}>Private Room</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, padding: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
        <Switch value={record} onValueChange={setRecord} trackColor={{ true: Colors.red }} />
        <Text style={{ color: Colors.text, fontFamily: Fonts.mono, fontSize: 13 }}>Record (save replay)</Text>
      </View>
      {isPrivate && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {[{v:"password",l:"Password"},{v:"invite_only",l:"Invite Only"},{v:"paid",l:"Paid"},{v:"followers",l:"Followers"},{v:"subscribers",l:"Subscribers"},{v:"vip",l:"VIP"}].map(at => (
              <TouchableOpacity key={at.v} onPress={() => setAccessType(at.v)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: accessType === at.v ? Colors.green + "22" : Colors.card, borderWidth: 1, borderColor: accessType === at.v ? Colors.green : Colors.border }}>
                <Text style={{ color: accessType === at.v ? Colors.green : Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11 }}>{at.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {accessType === "password" && <Field value={password} onChangeText={setPassword} placeholder="Room password" secureTextEntry style={{ fontSize: 14, marginBottom: 0 }} />}
          {accessType === "paid" && <Field value={entryCost} onChangeText={t => setEntryCost(t.replace(/\D/g, ""))} placeholder="Coin cost" keyboardType="numeric" style={{ fontSize: 14, marginBottom: 0 }} />}
        </View>
      )}
      <Button label="START LIVE" variant="danger" icon="radio" onPress={handleStart} loading={loading} disabled={!title.trim()} />
    </ScrollView>
  );
}
