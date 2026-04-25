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
import { getUserProfile, followUser, unfollowUser, startConversation } from "@/lib/api";
import { formatNumber, getInitial } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function UserProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const { user: me, token } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setError("");
      const data = await getUserProfile(username!, token);
      setProfile(data.user || data);
      setIsFollowing(data.is_following || false);
    } catch (e: any) {
      setError(e?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [username, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleFollowToggle() {
    if (!profile || !token) return;
    try {
      if (isFollowing) {
        await unfollowUser(profile.id, token);
      } else {
        await followUser(profile.id, token);
      }
      setIsFollowing(!isFollowing);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              follower_count: isFollowing
                ? prev.follower_count - 1
                : prev.follower_count + 1,
            }
          : prev
      );
    } catch {}
  }

  async function handleMessage() {
    if (!profile || !token) return;
    try {
      const conv = await startConversation(profile.id, token);
      const convId = conv.id || conv.conversation_id;
      router.push(`/(app)/messages/${convId}`);
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

  if (error || !profile) {
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
          {error || "User not found."}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.blue, fontSize: 14, fontWeight: "600" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMe = me?.id === profile.id;

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
          @{profile.username}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center" }}>
        {/* Avatar */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: Colors.green,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            borderWidth: 2,
            borderColor: "rgba(74,154,74,0.3)",
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 32, fontWeight: "700" }}>
            {getInitial(profile.display_name || profile.username)}
          </Text>
        </View>

        <Text
          style={{
            color: Colors.text,
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 4,
          }}
        >
          {profile.display_name || profile.username}
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 14,
            fontFamily: "monospace",
            marginBottom: 16,
          }}
        >
          @{profile.username}
        </Text>

        {profile.bio ? (
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
              marginBottom: 20,
              paddingHorizontal: 16,
            }}
          >
            {profile.bio}
          </Text>
        ) : null}

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 32,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            width: "100%",
            marginBottom: 24,
          }}
        >
          {[
            { label: "Posts", value: profile.post_count },
            { label: "Followers", value: profile.follower_count },
            { label: "Following", value: profile.following_count },
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

        {/* Actions */}
        {!isMe && token ? (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={handleFollowToggle}
              style={{
                backgroundColor: isFollowing ? Colors.card : Colors.green,
                borderWidth: 1,
                borderColor: isFollowing ? Colors.border : Colors.green,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 28,
              }}
            >
              <Text
                style={{
                  color: isFollowing ? Colors.textSecondary : Colors.white,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMessage}
              style={{
                backgroundColor: Colors.card,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 28,
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Message
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
