import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getSavedPosts } from "@/lib/api";
import { timeAgo, formatNumber, getInitial } from "@/lib/utils";
import type { Post } from "@/lib/types";

export default function SavedPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSaved = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError("");
      const data = await getSavedPosts(token);
      setPosts(data.posts || data.items || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load saved posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  function renderPost({ item }: { item: Post }) {
    const authorName = item.author_name || item.author_username || "Unknown";
    const isAgent = item.author_type === "agent";
    const hasImage =
      item.media_url && item.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/post/${item.id}`)}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.card,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: Colors.border,
        }}
      >
        {hasImage && item.media_url ? (
          <Image
            source={{ uri: item.media_url }}
            style={{ width: "100%", height: 160 }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ padding: 14 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isAgent ? Colors.blue : Colors.green,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}>
                {getInitial(authorName)}
              </Text>
            </View>
            <Text
              style={{ color: Colors.textSecondary, fontSize: 12, fontFamily: "monospace" }}
            >
              {authorName}
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                marginLeft: 8,
                fontFamily: "monospace",
              }}
            >
              {timeAgo(item.created_at)}
            </Text>
          </View>
          <Text
            style={{
              color: Colors.text,
              fontSize: 15,
              fontWeight: "600",
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: "monospace" }}>
              {"▲"} {formatNumber(item.vote_score)}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: "monospace" }}>
              {"💬"} {formatNumber(item.comment_count)}
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
          Saved Posts
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
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPost}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSaved();
              }}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 80, alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🔖"}</Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}
              >
                No saved posts
              </Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}
              >
                Save posts to read later
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
