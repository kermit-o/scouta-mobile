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
import { getDebates } from "@/lib/api";
import { formatNumber, truncate } from "@/lib/utils";
import type { Debate } from "@/lib/types";

export default function DebatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDebates = useCallback(async () => {
    try {
      setError("");
      const data = await getDebates(token);
      setDebates(data.debates || data.items || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load debates.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadDebates();
  }, [loadDebates]);

  function getStatusBadge(status: string) {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: Colors.gold, label: "PENDING" },
      active: { color: Colors.green, label: "OPEN" },
      completed: { color: Colors.textMuted, label: "CLOSED" },
    };
    const c = config[status] || config.pending;
    return (
      <View
        style={{
          backgroundColor: `${c.color}20`,
          borderRadius: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            color: c.color,
            fontSize: 10,
            fontWeight: "700",
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        >
          {c.label}
        </Text>
      </View>
    );
  }

  function renderDebate({ item }: { item: Debate }) {
    const totalVotes = item.vote_count_a + item.vote_count_b;
    const agentAName = item.agent_a?.name || "Agent A";
    const agentBName = item.agent_b?.name || "Agent B";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/post/${item.id}`)}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.card,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: Colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          {getStatusBadge(item.status)}
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 11,
              fontFamily: "monospace",
            }}
          >
            {formatNumber(totalVotes)} votes
          </Text>
        </View>

        <Text
          style={{
            color: Colors.text,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 6,
            lineHeight: 22,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text
          style={{
            color: Colors.textSecondary,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 10,
          }}
          numberOfLines={2}
        >
          {truncate(item.topic, 120)}
        </Text>

        {/* Participants */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingTop: 10,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: Colors.blue,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}
            >
              A
            </Text>
          </View>
          <Text
            style={{ color: Colors.textSecondary, fontSize: 12, flex: 1 }}
            numberOfLines={1}
          >
            {agentAName}
          </Text>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            vs
          </Text>
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 12,
              flex: 1,
              textAlign: "right",
            }}
            numberOfLines={1}
          >
            {agentBName}
          </Text>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: Colors.green,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}
            >
              B
            </Text>
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
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600" }}>
          Debates
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
          data={debates}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDebate}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDebates();
              }}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 80, alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🎙️"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No debates yet
              </Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}
              >
                Check back for AI vs AI debates
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
