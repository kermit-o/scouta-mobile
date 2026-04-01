import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { joinStream, getGiftCatalog, sendGift } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, WS_BASE, API_BASE } from "@/lib/constants";

interface ChatMsg { username?: string; display_name?: string; message: string; is_agent?: boolean; type?: string; }
interface GiftItem { id: number; name: string; emoji: string; coin_cost: number; }
interface GiftEvent { sender: string; emoji: string; gift_name: string; }

export default function LiveRoomScreen() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "connected" | "error" | "ended">("connecting");
  const [error, setError] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [message, setMessage] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [giftEvent, setGiftEvent] = useState<GiftEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatRef = useRef<FlatList>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    (async () => {
      try {
        const result = await joinStream(roomName);
        if (result.status === 200 && result.data?.token) {
          setStatus("connected");
          try { const cr = await fetch(`${API_BASE}/live/${roomName}/chat?limit=50`); const cd = await cr.json(); setChat(cd.messages || []); } catch {}
          const wsUrl = API_BASE.replace("https://", "wss://").replace("http://", "ws://") + `/live/${roomName}/ws`;
          ws = new WebSocket(wsUrl); wsRef.current = ws;
          ws.onmessage = (e) => {
            try {
              const msg = JSON.parse(e.data);
              if (msg.type === "chat") setChat(prev => [...prev.slice(-99), msg]);
              else if (msg.type === "gift") { setGiftEvent({ sender: msg.sender, emoji: msg.emoji, gift_name: msg.gift_name }); setTimeout(() => setGiftEvent(null), 3000); }
              else if (msg.type === "stream_ended") setStatus("ended");
            } catch {}
          };
          try { const gd = await getGiftCatalog(); setGifts(gd.gifts || []); } catch {}
        } else { setError(result.data?.detail || "Failed to join"); setStatus("error"); }
      } catch { setError("Network error"); setStatus("error"); }
    })();
    return () => { ws?.close(); };
  }, [roomName]);

  function sendMessage() {
    if (!message.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "chat", user_id: user?.id, username: user?.username, display_name: user?.display_name || user?.username, message: message.trim() }));
    setMessage("");
  }

  async function handleSendGift(gift: GiftItem) {
    const result = await sendGift(roomName, gift.id);
    if (result.ok) setShowGifts(false);
    else Alert.alert("Error", result.detail || "Failed to send gift");
  }

  async function handleEndStream() {
    Alert.alert("End Stream", "Are you sure?", [
      { text: "Cancel" },
      { text: "End", style: "destructive", onPress: async () => {
        try { const t = await getToken(); await fetch(`${API_BASE}/live/${roomName}/end`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }); } catch {}
        router.back();
      }},
    ]);
  }

  if (status === "ended" || status === "error") return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>{status === "ended" ? "📡" : "⚠️"}</Text>
      <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600", marginBottom: 8 }}>{status === "ended" ? "Stream Ended" : "Error"}</Text>
      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 24, textAlign: "center" }}>{error || "The stream has ended"}</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ borderWidth: 1, borderColor: Colors.blue, paddingHorizontal: 24, paddingVertical: 10 }}>
        <Text style={{ color: Colors.blue, fontFamily: Fonts.mono }}>Back to Live</Text>
      </TouchableOpacity>
    </View>
  );

  if (status === "connecting") return <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={Colors.green} size="large" /><Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, marginTop: 12 }}>Connecting...</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 50, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}><Text style={{ color: Colors.textMuted, fontSize: 20 }}>✕</Text></TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red }} />
          <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 11 }}>LIVE</Text>
        </View>
        <TouchableOpacity onPress={handleEndStream} style={{ backgroundColor: Colors.red + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 10 }}>End</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: "30%", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 40, opacity: 0.3 }}>📡</Text>
        <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11, marginTop: 8 }}>Live Stream</Text>
      </View>
      {giftEvent && (
        <View style={{ position: "absolute", top: "20%", left: 0, right: 0, alignItems: "center", zIndex: 50 }}>
          <View style={{ backgroundColor: "rgba(0,0,0,0.85)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>{giftEvent.emoji}</Text>
            <Text style={{ color: Colors.gold, fontFamily: Fonts.mono, fontSize: 11, marginTop: 4 }}>{giftEvent.sender} sent {giftEvent.gift_name}</Text>
          </View>
        </View>
      )}
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <FlatList ref={chatRef} data={chat} keyExtractor={(_, i) => String(i)}
          onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", gap: 6, paddingVertical: 3 }}>
              <Text style={{ color: item.is_agent ? Colors.blue : Colors.green, fontFamily: Fonts.mono, fontSize: 11, fontWeight: "700" }}>{item.display_name || item.username}{item.is_agent ? " ⚡" : ""}</Text>
              <Text style={{ color: Colors.text, fontSize: 13, flex: 1 }}>{item.message}</Text>
            </View>
          )} />
      </View>
      {showGifts && (
        <View style={{ backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border, padding: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10 }}>SEND A GIFT</Text>
            <TouchableOpacity onPress={() => setShowGifts(false)}><Text style={{ color: Colors.textMuted }}>✕</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {gifts.map(g => (
              <TouchableOpacity key={g.id} onPress={() => handleSendGift(g)} style={{ backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, alignItems: "center", width: "30%" }}>
                <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                <Text style={{ color: Colors.text, fontFamily: Fonts.mono, fontSize: 10, marginTop: 2 }}>{g.name}</Text>
                <Text style={{ color: Colors.gold, fontFamily: Fonts.mono, fontSize: 9 }}>🪙 {g.coin_cost}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <TouchableOpacity onPress={() => setShowGifts(!showGifts)} style={{ backgroundColor: Colors.gold + "33", borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
        </TouchableOpacity>
        <TextInput value={message} onChangeText={setMessage} onSubmitEditing={sendMessage} placeholder="Say something..." placeholderTextColor={Colors.textMuted}
          style={{ flex: 1, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, fontFamily: Fonts.mono, fontSize: 13 }} />
        <TouchableOpacity onPress={sendMessage} style={{ backgroundColor: Colors.green, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
