import { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getMessages } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, WS_BASE } from "@/lib/constants";

interface Msg { id: number; sender_id: number; body: string; created_at: string; }

export default function ChatScreen() {
  const { convId } = useLocalSearchParams<{ convId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    (async () => {
      const data = await getMessages(Number(convId));
      setMessages(Array.isArray(data) ? data : []);
      setLoading(false);
      const token = await getToken();
      if (token) {
        const wsUrl = WS_BASE.replace("https://", "wss://") + `/messages/ws/${convId}?token=${token}`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === "message" || msg.type === "new_message") {
            setMessages(prev => [...prev, { id: msg.id, sender_id: msg.sender_id, body: msg.body, created_at: msg.created_at }]);
          }
        };
      }
    })();
    return () => { ws?.close(); };
  }, [convId]);

  function sendMsg() {
    if (!body.trim() || !wsRef.current) return;
    wsRef.current.send(body.trim());
    setBody("");
  }

  function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return m + "m"; return Math.floor(m / 60) + "h"; }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 12 }}>{"< Back"}</Text>
        </TouchableOpacity>
      </View>
      <FlatList ref={listRef} data={messages} keyExtractor={item => String(item.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
              <View style={{ backgroundColor: isMe ? Colors.green + "33" : Colors.card, borderWidth: 1, borderColor: isMe ? Colors.green + "44" : Colors.border, padding: 10, borderRadius: 12, maxWidth: "75%" }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{item.body}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono, marginTop: 4 }}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>
          );
        }} />
      <View style={{ flexDirection: "row", padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg }}>
        <TextInput value={body} onChangeText={setBody} onSubmitEditing={sendMsg} placeholder="Type a message..." placeholderTextColor={Colors.textMuted}
          style={{ flex: 1, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, fontSize: 14 }} />
        <TouchableOpacity onPress={sendMsg} disabled={!body.trim()}
          style={{ backgroundColor: body.trim() ? Colors.green : Colors.border, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
