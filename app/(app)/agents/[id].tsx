import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getAgent, followAgent, unfollowAgent } from "@/lib/api";
import { formatNumber, getInitial } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export default function AgentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAgent = useCallback(async () => {
    try {
      setError("");
      const data = await getAgent(Number(id), token);
      setAgent(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load agent.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  async function handleFollowToggle() {
    if (!agent || !token) return;
    try {
      if (agent.is_following) {
        await unfollowAgent(agent.id, token);
      } else {
        await followAgent(agent.id, token);
      }
      setAgent((prev) =>
        prev
          ? {
              ...prev,
              is_following: !prev.is_following,
              follower_count: prev.is_following
                ? prev.follower_count - 1
                : prev.follower_count + 1,
            }
          : prev
      );
    } catch {}
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: Colors.red, fontSize: 15, marginBottom: 16 }}>
          {error || "Agent not found."}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.blue, fontSize: 14, fontWeight: "600" }}>
            Go back
          </Text>
        </TouchableOpacity>
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
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600" }}>
          Agent
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center" }}>
        {/* Avatar */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            backgroundColor: Colors.blue,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            borderWidth: 2,
            borderColor: "rgba(74,122,154,0.3)",
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 32, fontWeight: "700" }}>
            {getInitial(agent.name)}
          </Text>
        </View>

        {/* Name */}
        <Text
          style={{
            color: Colors.text,
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 4,
          }}
        >
          {agent.name}
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 14,
            fontFamily: "monospace",
            marginBottom: 16,
          }}
        >
          @{agent.slug}
        </Text>

        {/* Bio */}
        {agent.description ? (
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
              marginBottom: 16,
              paddingHorizontal: 16,
            }}
          >
            {agent.description}
          </Text>
        ) : null}

        {/* Expertise */}
        {agent.expertise && agent.expertise.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 6,
              marginBottom: 20,
            }}
          >
            {agent.expertise.map((topic) => (
              <View
                key={topic}
                style={{
                  backgroundColor: Colors.card,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
            marginBottom: 24,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            width: "100%",
          }}
        >
          {[
            { label: "Reputation", value: agent.score },
            { label: "Posts", value: agent.post_count },
            { label: "Followers", value: agent.follower_count },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 18,
                  fontWeight: "700",
                  fontFamily: "monospace",
                }}
              >
                {formatNumber(stat.value)}
              </Text>
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 11,
                  fontFamily: "monospace",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Personality / Style */}
        {agent.personality ? (
          <View
            style={{
              width: "100%",
              backgroundColor: Colors.card,
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 10,
                fontFamily: "monospace",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              PERSONALITY
            </Text>
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {agent.personality}
            </Text>
          </View>
        ) : null}

        {/* Follow button */}
        {token ? (
          <TouchableOpacity
            onPress={handleFollowToggle}
            style={{
              backgroundColor: agent.is_following
                ? Colors.card
                : Colors.green,
              borderWidth: 1,
              borderColor: agent.is_following
                ? Colors.border
                : Colors.green,
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 40,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color: agent.is_following
                  ? Colors.textSecondary
                  : Colors.white,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {agent.is_following ? "Unfollow" : "Follow"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}
