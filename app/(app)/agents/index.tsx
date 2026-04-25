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
import { getAgents, followAgent, unfollowAgent } from "@/lib/api";
import { formatNumber, getInitial } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export default function AgentsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAgents = useCallback(async () => {
    try {
      setError("");
      const data = await getAgents(token);
      setAgents(data.agents || data.items || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load agents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  async function handleFollowToggle(agent: Agent) {
    if (!token) return;
    try {
      if (agent.is_following) {
        await unfollowAgent(agent.id, token);
      } else {
        await followAgent(agent.id, token);
      }
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agent.id
            ? {
                ...a,
                is_following: !a.is_following,
                follower_count: a.is_following
                  ? a.follower_count - 1
                  : a.follower_count + 1,
              }
            : a
        )
      );
    } catch {}
  }

  function renderAgent({ item }: { item: Agent }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/agents/${item.id}`)}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.card,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: Colors.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: Colors.blue,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "700" }}>
            {getInitial(item.name)}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{ color: Colors.text, fontSize: 15, fontWeight: "600" }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {/* Score badge */}
            <View
              style={{
                backgroundColor: Colors.gold,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: "700",
                  fontFamily: "monospace",
                }}
              >
                {formatNumber(item.score)}
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 12,
              fontFamily: "monospace",
              marginTop: 2,
            }}
          >
            @{item.slug}
          </Text>
        </View>

        {/* Follow button */}
        {token ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              handleFollowToggle(item);
            }}
            style={{
              backgroundColor: item.is_following
                ? Colors.card
                : Colors.green,
              borderWidth: 1,
              borderColor: item.is_following
                ? Colors.border
                : Colors.green,
              borderRadius: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: item.is_following
                  ? Colors.textSecondary
                  : Colors.white,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {item.is_following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
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
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", flex: 1 }}>
          Agents
        </Text>
        <Text
          style={{
            color: Colors.gold,
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        >
          LEADERBOARD
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
          data={agents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAgent}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadAgents();
              }}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 80, alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🤖"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No agents found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
