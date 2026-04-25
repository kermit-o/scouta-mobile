import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, WS_BASE } from "@/lib/constants";
import { getMessages, sendMessage as sendMessageAPI, getConversation } from "@/lib/api";
import { timeAgo, getInitial } from "@/lib/utils";
import type { Message, Conversation } from "@/lib/types";

export default function ConversationScreen() {
  const router = useRouter();
  const { convId } = useLocalSearchParams<{ convId: string }>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadConversation = useCallback(async () => {
    try {
      const data = await getConversation(Number(convId), token);
      setConversation(data);
    } catch {}
  }, [convId, token]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(Number(convId), token);
      const items = data.messages || data.items || data || [];
      setMessages(items);
    } catch {}
    setLoading(false);
  }, [convId, token]);

  useEffect(() => {
    loadConversation();
    loadMessages();
  }, [loadConversation, loadMessages]);

  // WebSocket for real-time messages
  useEffect(() => {
    if (!convId || !token) return;

    const wsUrl = `${WS_BASE}/messages/${convId}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const msg: Message = {
          id: data.id || Date.now(),
          conversation_id: Number(convId),
          sender_id: data.sender_id,
          sender_name: data.sender_name || "Unknown",
          sender_avatar: data.sender_avatar || null,
          sender_type: data.sender_type || "user",
          content: data.content || "",
          message_type: data.message_type || "text",
          media_url: data.media_url || null,
          is_read: false,
          created_at: data.created_at || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, msg]);
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [convId, token]);

  async function handleSend() {
    if (!inputText.trim() || !token || sending) return;
    setSending(true);
    try {
      const msg = await sendMessageAPI(Number(convId), inputText.trim(), token);
      if (msg) {
        setMessages((prev) => [...prev, msg]);
      }
      setInputText("");
    } catch {}
    setSending(false);
  }

  function getOtherName() {
    if (!conversation || !user) return "Chat";
    const other = conversation.participants?.find(
      (p) => p.user_id !== user.id
    );
    return other?.display_name || other?.username || "Chat";
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender_id === user?.id;

    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 4,
          alignItems: isMe ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            backgroundColor: isMe
              ? "rgba(74,154,74,0.15)"
              : Colors.card,
            borderRadius: 16,
            borderTopLeftRadius: isMe ? 16 : 4,
            borderTopRightRadius: isMe ? 4 : 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            maxWidth: "78%",
          }}
        >
          {!isMe ? (
            <Text
              style={{
                color:
                  item.sender_type === "agent"
                    ? Colors.blue
                    : Colors.green,
                fontSize: 11,
                fontWeight: "700",
                marginBottom: 3,
              }}
            >
              {item.sender_name}
            </Text>
          ) : null}
          <Text
            style={{
              color: Colors.text,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {item.content}
          </Text>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 10,
              fontFamily: "monospace",
              marginTop: 4,
              alignSelf: isMe ? "flex-end" : "flex-start",
            }}
          >
            {timeAgo(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
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
        <Text
          style={{
            color: Colors.text,
            fontSize: 18,
            fontWeight: "600",
            flex: 1,
          }}
        >
          {getOtherName()}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={Colors.green} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 8 }}
            onContentSizeChange={() => {
              try {
                flatListRef.current?.scrollToEnd({ animated: true });
              } catch {}
            }}
            ListEmptyComponent={
              <View style={{ paddingTop: 60, alignItems: "center" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            padding: 10,
            paddingBottom: insets.bottom + 10,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            gap: 8,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            multiline
            style={{
              flex: 1,
              backgroundColor: Colors.inputBg,
              borderWidth: 1,
              borderColor: Colors.inputBorder,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: Colors.text,
              fontSize: 14,
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: inputText.trim()
                ? Colors.green
                : Colors.textMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
