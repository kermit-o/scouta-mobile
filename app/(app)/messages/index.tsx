import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getConversations } from "@/lib/api";
import { timeAgo, getInitial, truncate } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

export default function MessagesIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError("");
      const data = await getConversations(token);
      setConversations(data.conversations || data.items || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  function getOtherParticipant(conv: Conversation) {
    if (!user) return conv.participants?.[0];
    return conv.participants?.find((p) => p.user_id !== user.id) || conv.participants?.[0];
  }

  function renderConversation({ item }: { item: Conversation }) {
    const other = getOtherParticipant(item);
    const name = other?.display_name || other?.username || "Unknown";
    const lastMsg = item.last_message?.content || "";
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/messages/${item.id}`)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          backgroundColor: hasUnread ? "rgba(74,154,74,0.05)" : "transparent",
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: other?.is_agent ? Colors.blue : Colors.green,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>
            {getInitial(name)}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <Text
              style={{
                color: Colors.text,
                fontSize: 15,
                fontWeight: hasUnread ? "700" : "500",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                fontFamily: "monospace",
                marginLeft: 8,
              }}
            >
              {item.last_message
                ? timeAgo(item.last_message.created_at)
                : ""}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: hasUnread ? Colors.textSecondary : Colors.textMuted,
                fontSize: 13,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {truncate(lastMsg, 50)}
            </Text>
            {hasUnread ? (
              <View
                style={{
                  backgroundColor: Colors.green,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: "700",
                    fontFamily: "monospace",
                  }}
                >
                  {item.unread_count}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
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
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700" }}>
          Messages
        </Text>
      </View>

      {error ? (
        <View style={{ margin: 16, padding: 12, backgroundColor: "rgba(238,68,68,0.1)", borderRadius: 8 }}>
          <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderConversation}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadConversations();
              }}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 80, alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"💬"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No messages yet
              </Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}
              >
                Start a conversation!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
