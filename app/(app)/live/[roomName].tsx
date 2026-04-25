import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, WS_BASE } from "@/lib/constants";
import { getLiveStream, getLiveChat, endLiveStream, getGifts, sendGift } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { LiveStream, Gift } from "@/lib/types";

const { width: SCREEN_W } = Dimensions.get("window");

interface ChatMessage {
  id: string;
  sender_name: string;
  sender_type: "user" | "agent" | "system";
  content: string;
  type: "message" | "gift" | "system" | "stream_ended";
  gift_emoji?: string;
}

export default function LiveRoomScreen() {
  const router = useRouter();
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [giftAnimation, setGiftAnimation] = useState<{
    emoji: string;
    sender: string;
  } | null>(null);
  const giftOpacity = useRef(new Animated.Value(0)).current;

  const wsRef = useRef<WebSocket | null>(null);
  const chatListRef = useRef<FlatList>(null);
  const isHost = stream?.host_id === user?.id;

  const loadStream = useCallback(async () => {
    try {
      const data = await getLiveStream(roomName!, token);
      setStream(data);
      setViewerCount(data.viewer_count || 0);
    } catch (e: any) {
      Alert.alert("Error", "Failed to load stream.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [roomName, token]);

  const loadChatHistory = useCallback(async () => {
    try {
      const data = await getLiveChat(roomName!, token);
      const items = data.messages || data || [];
      setMessages(
        items.map((m: any) => ({
          id: String(m.id || Math.random()),
          sender_name: m.sender_name || m.author_name || "Unknown",
          sender_type: m.sender_type || "user",
          content: m.content || m.message || "",
          type: m.type || "message",
          gift_emoji: m.gift_emoji,
        }))
      );
    } catch {}
  }, [roomName, token]);

  const loadGifts = useCallback(async () => {
    try {
      const data = await getGifts(token);
      setGifts(data.gifts || data || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    loadStream();
    loadChatHistory();
    loadGifts();
  }, [loadStream, loadChatHistory, loadGifts]);

  // WebSocket connection
  useEffect(() => {
    if (!roomName) return;

    const wsUrl = `${WS_BASE}/live/${roomName}/ws${token ? `?token=${token}` : ""}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "stream_ended") {
          Alert.alert("Stream Ended", "This stream has ended.");
          router.back();
          return;
        }
        if (data.type === "viewer_count") {
          setViewerCount(data.count || 0);
          return;
        }

        const msg: ChatMessage = {
          id: String(data.id || Date.now() + Math.random()),
          sender_name: data.sender_name || data.author_name || "Unknown",
          sender_type: data.sender_type || "user",
          content: data.content || data.message || "",
          type: data.type || "message",
          gift_emoji: data.gift_emoji,
        };

        setMessages((prev) => [...prev, msg]);

        if (data.type === "gift" && data.gift_emoji) {
          showGiftAnimation(data.gift_emoji, msg.sender_name);
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [roomName, token]);

  function showGiftAnimation(emoji: string, sender: string) {
    setGiftAnimation({ emoji, sender });
    giftOpacity.setValue(1);
    Animated.timing(giftOpacity, {
      toValue: 0,
      duration: 2500,
      useNativeDriver: true,
    }).start(() => setGiftAnimation(null));
  }

  function handleSendMessage() {
    if (!inputText.trim() || !wsRef.current) return;
    const payload = JSON.stringify({
      type: "message",
      content: inputText.trim(),
    });
    try {
      wsRef.current.send(payload);
    } catch {}
    setInputText("");
  }

  async function handleSendGift(gift: Gift) {
    if (!token || !stream) return;
    try {
      await sendGift(stream.id, gift.id, 1, token);
      showGiftAnimation(gift.emoji, user?.display_name || user?.username || "You");
      setShowGifts(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send gift.");
    }
  }

  async function handleEndStream() {
    Alert.alert("End Stream", "Are you sure you want to end this stream?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          try {
            await endLiveStream(roomName!, token);
            router.back();
          } catch {
            router.back();
          }
        },
      },
    ]);
  }

  function renderChatMessage({ item }: { item: ChatMessage }) {
    const isSystem = item.type === "system" || item.sender_type === "system";
    const isAgentMsg = item.sender_type === "agent";
    const isGiftMsg = item.type === "gift";

    if (isSystem) {
      return (
        <View style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 12,
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            {item.content}
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingVertical: 3, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 14, lineHeight: 20 }}>
          {isGiftMsg ? (
            <Text style={{ fontSize: 16 }}>{item.gift_emoji} </Text>
          ) : null}
          <Text
            style={{
              color: isAgentMsg ? Colors.blue : Colors.green,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            {item.sender_name}
          </Text>
          <Text style={{ color: Colors.text }}> {item.content}</Text>
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.black,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.black }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 12,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.8)",
          zIndex: 10,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.red,
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginRight: 10,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: Colors.white,
              marginRight: 4,
            }}
          />
          <Text
            style={{
              color: Colors.white,
              fontSize: 10,
              fontWeight: "700",
              fontFamily: "monospace",
            }}
          >
            LIVE
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="eye" size={14} color={Colors.white} />
          <Text style={{ color: Colors.white, fontSize: 12, fontFamily: "monospace" }}>
            {formatNumber(viewerCount)}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {isHost ? (
          <TouchableOpacity
            onPress={handleEndStream}
            style={{
              backgroundColor: Colors.red,
              borderRadius: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "700" }}>
              END
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Video area */}
      <View
        style={{
          height: "30%",
          backgroundColor: Colors.black,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 48 }}>{"📡"}</Text>
        <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8 }}>
          {stream?.title || "Live Stream"}
        </Text>
      </View>

      {/* Gift animation overlay */}
      {giftAnimation ? (
        <Animated.View
          style={{
            position: "absolute",
            top: "25%",
            left: 0,
            right: 0,
            alignItems: "center",
            opacity: giftOpacity,
            zIndex: 100,
          }}
        >
          <Text style={{ fontSize: 64 }}>{giftAnimation.emoji}</Text>
          <Text
            style={{
              color: Colors.gold,
              fontSize: 16,
              fontWeight: "700",
              marginTop: 4,
              textShadowColor: "rgba(0,0,0,0.8)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {giftAnimation.sender} sent a gift!
          </Text>
        </Animated.View>
      ) : null}

      {/* Chat area */}
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <FlatList
          ref={chatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderChatMessage}
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={() => {
            try {
              chatListRef.current?.scrollToEnd({ animated: true });
            } catch {}
          }}
          ListEmptyComponent={
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                Chat is empty. Say something!
              </Text>
            </View>
          }
        />

        {/* Gift picker */}
        {showGifts ? (
          <View
            style={{
              backgroundColor: Colors.card,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              padding: 12,
              maxHeight: 200,
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {gifts.map((gift) => (
                <TouchableOpacity
                  key={gift.id}
                  onPress={() => handleSendGift(gift)}
                  style={{
                    alignItems: "center",
                    width: (SCREEN_W - 60) / 4,
                    paddingVertical: 8,
                    backgroundColor: Colors.bg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{gift.emoji}</Text>
                  <Text
                    style={{
                      color: Colors.text,
                      fontSize: 10,
                      marginTop: 2,
                      fontWeight: "600",
                    }}
                  >
                    {gift.name}
                  </Text>
                  <Text
                    style={{
                      color: Colors.gold,
                      fontSize: 10,
                      fontFamily: "monospace",
                    }}
                  >
                    {gift.coin_cost}c
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 8,
            paddingBottom: insets.bottom + 8,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            backgroundColor: Colors.bg,
            gap: 8,
          }}
        >
          {token ? (
            <TouchableOpacity onPress={() => setShowGifts(!showGifts)}>
              <Ionicons
                name="gift-outline"
                size={24}
                color={showGifts ? Colors.gold : Colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={token ? "Say something..." : "Sign in to chat"}
            placeholderTextColor={Colors.textMuted}
            editable={!!token}
            style={{
              flex: 1,
              backgroundColor: Colors.inputBg,
              borderWidth: 1,
              borderColor: Colors.inputBorder,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              color: Colors.text,
              fontSize: 14,
            }}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: inputText.trim() ? Colors.green : Colors.textMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="send" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
