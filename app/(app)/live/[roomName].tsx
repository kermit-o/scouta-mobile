import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, AppState } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { joinStream, getGiftCatalog, sendGift, startStream } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, API_BASE } from "@/lib/constants";

interface ChatMsg { username?: string; display_name?: string; message: string; is_agent?: boolean; type?: string; }
interface GiftItem { id: number; name: string; emoji: string; coin_cost: number; }

export default function LiveRoomScreen() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "connected" | "error" | "ended">("connecting");
  const [error, setError] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [message, setMessage] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [giftEvent, setGiftEvent] = useState<{sender:string;emoji:string;name:string}|null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatRef = useRef<FlatList>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let viewerInterval: NodeJS.Timeout;

    (async () => {
      try {
        const result = await joinStream(roomName);
        if (result.status === 200 && result.data?.token) {
          setStatus("connected");
          setStreamTitle(result.data.title || roomName);

          // Load chat history
          try { const cr = await fetch(`${API_BASE}/live/${roomName}/chat?limit=50`); const cd = await cr.json(); setChat(cd.messages || []); } catch {}

          // WebSocket
          const wsUrl = API_BASE.replace("https://","wss://").replace("http://","ws://") + `/live/${roomName}/ws`;
          ws = new WebSocket(wsUrl); wsRef.current = ws;
          ws.onmessage = (e) => {
            try {
              const msg = JSON.parse(e.data);
              if (msg.type === "chat") setChat(prev => [...prev.slice(-99), msg]);
              else if (msg.type === "gift") { setGiftEvent({sender:msg.sender,emoji:msg.emoji,name:msg.gift_name}); setTimeout(() => setGiftEvent(null), 3000); }
              else if (msg.type === "stream_ended") setStatus("ended");
            } catch {}
          };
          ws.onerror = () => {};
          ws.onclose = () => {};

          // Gifts catalog
          try { const gd = await getGiftCatalog(); setGifts(gd.gifts || []); } catch {}

          // Poll viewer count
          viewerInterval = setInterval(async () => {
            try {
              const r = await fetch(`${API_BASE}/live/active`);
              const d = await r.json();
              const s = (d.streams || []).find((s: any) => s.room_name === roomName);
              if (s) setViewerCount(s.viewer_count);
              else setStatus("ended");
            } catch {}
          }, 10000);
        } else {
          setError(result.data?.detail || "Cannot join stream");
          setStatus("error");
        }
      } catch {
        setError("Network error");
        setStatus("error");
      }
    })();

    return () => { ws?.close(); clearInterval(viewerInterval); };
  }, [roomName]);

  function sendMessage() {
    if (!message.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type:"chat", user_id:user?.id, username:user?.username, display_name:user?.display_name||user?.username, message:message.trim() }));
    setMessage("");
  }

  async function handleSendGift(gift: GiftItem) {
    const result = await sendGift(roomName, gift.id);
    if (result.ok) setShowGifts(false);
    else Alert.alert("Error", result.detail || "Not enough coins");
  }

  async function handleEndStream() {
    Alert.alert("End Stream", "Are you sure you want to end this stream?", [
      { text: "Cancel", style: "cancel" },
      { text: "End Stream", style: "destructive", onPress: async () => {
        try { const t = await getToken(); await fetch(`${API_BASE}/live/${roomName}/end`, { method:"POST", headers:{Authorization:`Bearer ${t}`} }); } catch {}
        router.back();
      }},
    ]);
  }

  // Error / Ended screens
  if (status === "ended" || status === "error") return (
    <View style={{ flex:1, backgroundColor:Colors.bg, alignItems:"center", justifyContent:"center", padding:24 }}>
      <Text style={{ fontSize:48, marginBottom:16 }}>{status === "ended" ? "\ud83d\udce1" : "\u26a0\ufe0f"}</Text>
      <Text style={{ color:Colors.text, fontSize:20, fontWeight:"700", marginBottom:8 }}>{status === "ended" ? "Stream Ended" : "Cannot Join"}</Text>
      <Text style={{ color:Colors.textMuted, fontFamily:Fonts.mono, fontSize:12, marginBottom:24, textAlign:"center" }}>{error || "This stream has ended. Thanks for watching!"}</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ borderWidth:1, borderColor:Colors.blue, paddingHorizontal:24, paddingVertical:12, borderRadius:8 }}>
        <Text style={{ color:Colors.blue, fontFamily:Fonts.mono, fontSize:13 }}>Back to Streams</Text>
      </TouchableOpacity>
    </View>
  );

  // Connecting
  if (status === "connecting") return (
    <View style={{ flex:1, backgroundColor:Colors.bg, alignItems:"center", justifyContent:"center" }}>
      <ActivityIndicator color={Colors.red} size="large" />
      <Text style={{ color:Colors.textMuted, fontFamily:Fonts.mono, fontSize:12, marginTop:16, letterSpacing:2 }}>CONNECTING...</Text>
    </View>
  );

  return (
    <View style={{ flex:1, backgroundColor:Colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop:48, paddingHorizontal:12, paddingBottom:8, flexDirection:"row", alignItems:"center", backgroundColor:"#000" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding:4 }}>
          <Text style={{ color:"#fff", fontSize:22 }}>\u2715</Text>
        </TouchableOpacity>
        <View style={{ flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:Colors.red }} />
          <Text style={{ color:Colors.red, fontFamily:Fonts.mono, fontSize:12, fontWeight:"700" }}>LIVE</Text>
          <Text style={{ color:"#fff", fontSize:12 }}>\u00b7</Text>
          <Text style={{ color:"rgba(255,255,255,0.7)", fontFamily:Fonts.mono, fontSize:11 }}>{viewerCount} watching</Text>
        </View>
        <TouchableOpacity onPress={handleEndStream} style={{ backgroundColor:Colors.red, paddingHorizontal:12, paddingVertical:6, borderRadius:4 }}>
          <Text style={{ color:"#fff", fontFamily:Fonts.mono, fontSize:11, fontWeight:"700" }}>END</Text>
        </TouchableOpacity>
      </View>

      {/* Stream area */}
      <View style={{ height:"28%", backgroundColor:"#000", alignItems:"center", justifyContent:"center" }}>
        <Text style={{ color:"rgba(255,255,255,0.15)", fontSize:60 }}>\ud83d\udce1</Text>
        <Text style={{ color:"rgba(255,255,255,0.4)", fontFamily:Fonts.mono, fontSize:12, marginTop:8 }}>{streamTitle}</Text>
      </View>

      {/* Gift animation overlay */}
      {giftEvent && (
        <View style={{ position:"absolute", top:"22%", left:0, right:0, alignItems:"center", zIndex:50 }}>
          <View style={{ backgroundColor:"rgba(0,0,0,0.9)", paddingHorizontal:24, paddingVertical:14, borderRadius:16, flexDirection:"row", alignItems:"center", gap:10 }}>
            <Text style={{ fontSize:36 }}>{giftEvent.emoji}</Text>
            <View>
              <Text style={{ color:Colors.gold, fontFamily:Fonts.mono, fontSize:12, fontWeight:"700" }}>{giftEvent.sender}</Text>
              <Text style={{ color:Colors.textMuted, fontSize:11 }}>sent {giftEvent.name}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Chat */}
      <View style={{ flex:1 }}>
        <FlatList ref={chatRef} data={chat} keyExtractor={(_,i) => String(i)}
          onContentSizeChange={() => chatRef.current?.scrollToEnd({animated:false})}
          contentContainerStyle={{ paddingHorizontal:12, paddingVertical:8 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection:"row", gap:6, paddingVertical:4 }}>
              <Text style={{ color:item.is_agent ? Colors.blue : Colors.green, fontFamily:Fonts.mono, fontSize:12, fontWeight:"700" }}>
                {item.display_name || item.username}{item.is_agent ? " \u26a1" : ""}
              </Text>
              <Text style={{ color:Colors.text, fontSize:14, flex:1 }}>{item.message}</Text>
            </View>
          )} />
      </View>

      {/* Gift picker */}
      {showGifts && (
        <View style={{ backgroundColor:Colors.card, borderTopWidth:1, borderTopColor:Colors.border, padding:12 }}>
          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <Text style={{ color:Colors.text, fontWeight:"600", fontSize:14 }}>Send a Gift</Text>
            <TouchableOpacity onPress={() => setShowGifts(false)}><Text style={{ color:Colors.textMuted, fontSize:20 }}>\u2715</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
            {gifts.map(g => (
              <TouchableOpacity key={g.id} onPress={() => handleSendGift(g)}
                style={{ backgroundColor:Colors.bg, borderWidth:1, borderColor:Colors.border, borderRadius:12, paddingVertical:12, paddingHorizontal:8, alignItems:"center", width:"30%" }}>
                <Text style={{ fontSize:28 }}>{g.emoji}</Text>
                <Text style={{ color:Colors.text, fontSize:11, marginTop:4 }}>{g.name}</Text>
                <Text style={{ color:Colors.gold, fontFamily:Fonts.mono, fontSize:10 }}>\ud83e\ude99 {g.coin_cost}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={{ flexDirection:"row", paddingHorizontal:8, paddingVertical:8, gap:8, borderTopWidth:1, borderTopColor:Colors.border, backgroundColor:Colors.bg }}>
        <TouchableOpacity onPress={() => setShowGifts(!showGifts)}
          style={{ width:42, height:42, borderRadius:21, backgroundColor:showGifts ? Colors.gold+"44" : Colors.card, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:showGifts ? Colors.gold : Colors.border }}>
          <Text style={{ fontSize:20 }}>\ud83c\udf81</Text>
        </TouchableOpacity>
        <TextInput value={message} onChangeText={setMessage} onSubmitEditing={sendMessage}
          placeholder="Say something..." placeholderTextColor={Colors.textMuted}
          style={{ flex:1, backgroundColor:Colors.inputBg, borderWidth:1, borderColor:Colors.inputBorder, color:Colors.text, paddingHorizontal:14, paddingVertical:10, borderRadius:24, fontSize:14 }} />
        <TouchableOpacity onPress={sendMessage} disabled={!message.trim()}
          style={{ width:42, height:42, borderRadius:21, backgroundColor:message.trim() ? Colors.green : Colors.card, alignItems:"center", justifyContent:"center" }}>
          <Text style={{ color:"#fff", fontSize:18, fontWeight:"700" }}>\u2191</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
