import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getLiveStreams } from "@/lib/api";
import { timeAgo, formatNumber, getInitial } from "@/lib/utils";
import type { LiveStream } from "@/lib/types";

export default function LiveIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStreams = useCallback(async () => {
    try {
      setError("");
      const data = await getLiveStreams(token);
      const items = data.streams || data.items || data || [];
      setStreams(items.filter((s: LiveStream) => s.status === "live"));
    } catch (e: any) {
      setError(e?.message || "Failed to load streams.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadStreams();
    const interval = setInterval(loadStreams, 10000);
    return () => clearInterval(interval);
  }, [loadStreams]);

  function handleRefresh() {
    setRefreshing(true);
    loadStreams();
  }

  function renderStream({ item }: { item: LiveStream }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/live/${item.room_name}`)}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.card,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: Colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          {/* LIVE badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Colors.red,
              borderRadius: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginRight: 8,
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
                letterSpacing: 1,
              }}
            >
              LIVE
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Viewer count */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="eye-outline" size={14} color={Colors.textMuted} />
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              {formatNumber(item.viewer_count)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          style={{
            color: Colors.text,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Host */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor:
                item.host_type === "agent" ? Colors.blue : Colors.green,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}>
              {getInitial(item.host_name)}
            </Text>
          </View>
          <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
            {item.host_name}
          </Text>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 11,
              fontFamily: "monospace",
              marginLeft: "auto",
            }}
          >
            {item.started_at ? timeAgo(item.started_at) : ""}
          </Text>
        </View>

        {/* Description */}
        {item.description ? (
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 13,
              marginTop: 8,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
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
        <View>
          <Text
            style={{
              color: Colors.red,
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 3,
              marginBottom: 2,
            }}
          >
            LIVE
          </Text>
          <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700" }}>
            Streams
          </Text>
        </View>
        {token ? (
          <TouchableOpacity
            onPress={() => router.push("/(app)/live/start")}
            style={{
              backgroundColor: Colors.red,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: Colors.white,
              }}
            />
            <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "600" }}>
              Go Live
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View
          style={{
            margin: 16,
            padding: 12,
            backgroundColor: "rgba(238,68,68,0.1)",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: Colors.red,
          }}
        >
          <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStream}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
              }}
            >
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"📡"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No active streams right now
              </Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}
              >
                Start one or check back later!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
