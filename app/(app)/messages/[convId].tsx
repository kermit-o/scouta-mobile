import { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMessages } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, WS_BASE } from "@/lib/constants";
import { BackButton, Loading, EmptyState } from "@/components/ui";
import type { Message } from "@/lib/types";

export default function ChatScreen() {
  const { convId } = useLocalSearchParams<{ convId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const conversationId = Number(convId);

  // DMs are delivered over a WebSocket — the backend has no REST send endpoint.
  // Load history first, then open the socket; the server echoes our own sends
  // back (type "message") and pushes the peer's (type "new_message").
  useEffect(() => {
    let ws: WebSocket | null = null;
    let active = true;
    (async () => {
      try {
        const data = await getMessages(conversationId);
        const items = Array.isArray(data) ? data : (data as any).messages || [];
        if (active) setMessages(items);
      } catch {}
      if (active) setLoading(false);

      const tk = await getToken();
      ws = new WebSocket(`${WS_BASE}/messages/ws/${conversationId}?token=${encodeURIComponent(tk || "")}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (!m || m.id == null) return;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { id: m.id, sender_id: m.sender_id, body: m.body, read: true, created_at: m.created_at }]
          );
        } catch {}
      };
    })();
    return () => { active = false; if (ws) ws.close(); };
  }, [conversationId]);

  function handleSend() {
    const body = text.trim();
    if (!body || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(body);
    setText("");
  }

  function timeStr(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = user && item.sender_id === user.id;
    return (
      <View style={{
        alignSelf: isMe ? "flex-end" : "flex-start",
        maxWidth: "78%", marginBottom: 8,
      }}>
        <View style={{
          backgroundColor: isMe ? Colors.blue + "33" : Colors.card,
          borderWidth: 1, borderColor: isMe ? Colors.blue + "55" : Colors.border,
          paddingHorizontal: 12, paddingVertical: 8,
        }}>
          <Text style={{ color: Colors.text, fontSize: 14, lineHeight: 19 }}>{item.body}</Text>
        </View>
        <Text style={{
          color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono,
          marginTop: 2, alignSelf: isMe ? "flex-end" : "flex-start",
        }}>
          {timeStr(item.created_at)}
        </Text>
      </View>
    );
  }

  if (loading) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: 56, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BackButton />
        <Text style={{ color: Colors.text, fontSize: 16, fontWeight: "700" }}>Messages</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" text="No messages yet. Say hello!" />}
      />

      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingVertical: 10,
        borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
      }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={handleSend}
          style={{
            flex: 1, color: Colors.text, fontSize: 14,
            backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
            paddingHorizontal: 12, paddingVertical: 8,
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          style={{
            width: 40, height: 40, alignItems: "center", justifyContent: "center",
            backgroundColor: text.trim() ? Colors.blue : Colors.border,
          }}
        >
          <Ionicons name="send" size={16} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
