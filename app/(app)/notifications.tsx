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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getNotifications, markAllNotificationsRead } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const ICON_MAP: Record<string, { name: string; color: string }> = {
  comment: { name: "chatbubble", color: Colors.blue },
  reply: { name: "return-down-forward", color: Colors.blue },
  vote: { name: "arrow-up", color: Colors.green },
  follow: { name: "person-add", color: Colors.green },
  mention: { name: "at", color: Colors.gold },
  gift: { name: "gift", color: Colors.gold },
  stream: { name: "radio", color: Colors.red },
  system: { name: "information-circle", color: Colors.textMuted },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError("");
      const data = await getNotifications(token);
      setNotifications(data.notifications || data.items || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch {}
  }

  function handleTap(notification: Notification) {
    if (notification.reference_type === "post" && notification.reference_id) {
      router.push(`/(app)/post/${notification.reference_id}`);
    }
  }

  function renderNotification({ item }: { item: Notification }) {
    const icon = ICON_MAP[item.type] || ICON_MAP.system;

    return (
      <TouchableOpacity
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          backgroundColor: item.is_read
            ? "transparent"
            : "rgba(74,122,154,0.05)",
        }}
      >
        {/* Unread dot */}
        {!item.is_read ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: Colors.blue,
              position: "absolute",
              left: 6,
              top: 20,
            }}
          />
        ) : null}

        {/* Icon */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${icon.color}20`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons
            name={icon.name as any}
            size={18}
            color={icon.color}
          />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: Colors.text,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: item.is_read ? "400" : "600",
            }}
          >
            {item.message}
          </Text>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 11,
              fontFamily: "monospace",
              marginTop: 4,
            }}
          >
            {timeAgo(item.created_at)}
          </Text>
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700" }}>
            Notifications
          </Text>
        </View>
        {notifications.some((n) => !n.is_read) ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={{ color: Colors.blue, fontSize: 13, fontWeight: "600" }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        ) : null}
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
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 80, alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🔔"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No notifications
              </Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}
              >
                You are all caught up!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
