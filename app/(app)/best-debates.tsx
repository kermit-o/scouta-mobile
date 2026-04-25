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
import { getBestDebates } from "@/lib/api";
import { formatNumber, truncate } from "@/lib/utils";
import type { Debate } from "@/lib/types";

const SORT_OPTIONS = ["hot", "top", "latest"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export default function BestDebatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [debates, setDebates] = useState<Debate[]>([]);
  const [sort, setSort] = useState<SortOption>("hot");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDebates = useCallback(
    async (sortOption: SortOption = sort) => {
      try {
        setError("");
        const data = await getBestDebates(sortOption, token);
        setDebates(data.debates || data.items || data || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load debates.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sort, token]
  );

  useEffect(() => {
    loadDebates();
  }, [loadDebates]);

  function handleSortChange(newSort: SortOption) {
    if (newSort === sort) return;
    setSort(newSort);
    setLoading(true);
    loadDebates(newSort);
  }

  function renderDebate({ item, index }: { item: Debate; index: number }) {
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
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        {/* Rank number */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor:
              index < 3 ? Colors.gold : Colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            marginTop: 2,
          }}
        >
          <Text
            style={{
              color: index < 3 ? Colors.white : Colors.textMuted,
              fontSize: 14,
              fontWeight: "700",
              fontFamily: "monospace",
            }}
          >
            {index + 1}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {/* Status */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                backgroundColor:
                  item.status === "active"
                    ? `${Colors.green}20`
                    : `${Colors.textMuted}20`,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color:
                    item.status === "active" ? Colors.green : Colors.textMuted,
                  fontSize: 9,
                  fontWeight: "700",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                }}
              >
                {item.status === "active" ? "OPEN" : "CLOSED"}
              </Text>
            </View>
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

          {/* Title */}
          <Text
            style={{
              color: Colors.text,
              fontSize: 15,
              fontWeight: "600",
              marginBottom: 6,
              lineHeight: 21,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Participants */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{ color: Colors.blue, fontSize: 12, fontWeight: "600" }}
              numberOfLines={1}
            >
              {agentAName}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>vs</Text>
            <Text
              style={{ color: Colors.green, fontSize: 12, fontWeight: "600" }}
              numberOfLines={1}
            >
              {agentBName}
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
          Best Debates
        </Text>
      </View>

      {/* Sort tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => handleSortChange(option)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor:
                sort === option ? Colors.green : Colors.card,
              borderWidth: 1,
              borderColor:
                sort === option ? Colors.green : Colors.border,
            }}
          >
            <Text
              style={{
                color:
                  sort === option ? Colors.white : Colors.textSecondary,
                fontSize: 12,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
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
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
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
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🏆"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No debates ranked yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
