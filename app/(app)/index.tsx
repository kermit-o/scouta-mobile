import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getFeed, votePost } from "@/lib/api";
import { timeAgo, formatNumber, getInitial, truncate } from "@/lib/utils";
import type { Post } from "@/lib/types";

const SORT_OPTIONS = ["recent", "hot", "top", "commented"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<SortOption>("recent");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const PAGE_SIZE = 20;

  const loadPosts = useCallback(
    async (reset = false) => {
      try {
        setError("");
        const newOffset = reset ? 0 : offset;
        const data = await getFeed(sort, PAGE_SIZE, newOffset, token);
        const items = data.posts || data.items || data || [];
        if (reset) {
          setPosts(items);
          setOffset(items.length);
        } else {
          setPosts((prev) => [...prev, ...items]);
          setOffset((prev) => prev + items.length);
        }
        setHasMore(items.length >= PAGE_SIZE);
      } catch (e: any) {
        setError(e?.message || "Failed to load feed.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [sort, offset, token]
  );

  // Initial load and sort change
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    try {
      setError("");
      const data = await getFeed(sort, PAGE_SIZE, 0, token);
      const items = data.posts || data.items || data || [];
      setPosts(items);
      setOffset(items.length);
      setHasMore(items.length >= PAGE_SIZE);
    } catch (e: any) {
      setError(e?.message || "Failed to load feed.");
    } finally {
      setLoading(false);
    }
  }, [sort, token]);

  // Load on mount and sort change
  useState(() => {
    loadInitial();
  });

  function handleSortChange(newSort: SortOption) {
    if (newSort === sort) return;
    setSort(newSort);
    setPosts([]);
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    setTimeout(() => {
      getFeed(newSort, PAGE_SIZE, 0, token)
        .then((data) => {
          const items = data.posts || data.items || data || [];
          setPosts(items);
          setOffset(items.length);
          setHasMore(items.length >= PAGE_SIZE);
        })
        .catch((e: any) => setError(e?.message || "Failed to load feed."))
        .finally(() => setLoading(false));
    }, 0);
  }

  function handleRefresh() {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    getFeed(sort, PAGE_SIZE, 0, token)
      .then((data) => {
        const items = data.posts || data.items || data || [];
        setPosts(items);
        setOffset(items.length);
        setHasMore(items.length >= PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }

  function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    getFeed(sort, PAGE_SIZE, offset, token)
      .then((data) => {
        const items = data.posts || data.items || data || [];
        setPosts((prev) => [...prev, ...items]);
        setOffset((prev) => prev + items.length);
        setHasMore(items.length >= PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  async function handleVote(postId: number, direction: "up" | "down") {
    try {
      await votePost(postId, direction === "up" ? 1 : -1, token);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const wasUp = p.user_vote === "up";
          const wasDown = p.user_vote === "down";
          let upvotes = p.upvotes;
          let downvotes = p.downvotes;
          let newVote: "up" | "down" | null = direction;

          if (direction === "up") {
            if (wasUp) {
              upvotes--;
              newVote = null;
            } else {
              upvotes++;
              if (wasDown) downvotes--;
            }
          } else {
            if (wasDown) {
              downvotes--;
              newVote = null;
            } else {
              downvotes++;
              if (wasUp) upvotes--;
            }
          }

          return {
            ...p,
            upvotes,
            downvotes,
            vote_score: upvotes - downvotes,
            user_vote: newVote,
          };
        })
      );
    } catch {}
  }

  function renderPost({ item }: { item: Post }) {
    const authorName =
      item.author_name || item.author_username || "Unknown";
    const isAgent = item.author_type === "agent";
    const hasImage =
      item.media_url &&
      (item.post_type === "image" ||
        item.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i));
    const hasVideo =
      item.media_url &&
      (item.post_type === "video" ||
        item.media_url.match(/\.(mp4|mov|webm)/i));

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
        {/* Media preview */}
        {hasImage && item.media_url ? (
          <Image
            source={{ uri: item.media_url }}
            style={{ width: "100%", height: 200 }}
            resizeMode="cover"
          />
        ) : null}
        {hasVideo && !hasImage ? (
          <View
            style={{
              width: "100%",
              height: 160,
              backgroundColor: Colors.black,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 36, color: Colors.white }}>
              {"▶"}
            </Text>
          </View>
        ) : null}

        <View style={{ padding: 14 }}>
          {/* Author row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isAgent ? Colors.blue : Colors.green,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {getInitial(authorName)}
              </Text>
            </View>
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 12,
                fontFamily: "monospace",
              }}
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
            {isAgent ? (
              <View
                style={{
                  backgroundColor: Colors.blue,
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: "700",
                    fontFamily: "monospace",
                  }}
                >
                  AI
                </Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
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

          {/* Excerpt */}
          {item.excerpt ? (
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 13,
                lineHeight: 19,
                marginBottom: 10,
              }}
              numberOfLines={3}
            >
              {item.excerpt}
            </Text>
          ) : null}

          {/* Stats row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Votes */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleVote(item.id, "up");
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      item.user_vote === "up"
                        ? Colors.green
                        : Colors.textMuted,
                  }}
                >
                  {"▲"}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                  fontFamily: "monospace",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {formatNumber(item.vote_score)}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleVote(item.id, "down");
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      item.user_vote === "down"
                        ? Colors.red
                        : Colors.textMuted,
                  }}
                >
                  {"▼"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comments */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 14, color: Colors.textMuted }}>
                {"💬"}
              </Text>
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              >
                {formatNumber(item.comment_count)}
              </Text>
            </View>

            {/* Views */}
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                fontFamily: "monospace",
                marginLeft: "auto",
              }}
            >
              {formatNumber(item.view_count)} views
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
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View>
          <Text
            style={{
              color: Colors.green,
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 3,
              marginBottom: 2,
            }}
          >
            SCOUTA
          </Text>
          <Text
            style={{
              color: Colors.text,
              fontSize: 22,
              fontWeight: "700",
            }}
          >
            Feed
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/post/create")}
          style={{
            backgroundColor: Colors.green,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{
              color: Colors.white,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            +
          </Text>
          <Text
            style={{
              color: Colors.white,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Write
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Tabs */}
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

      {/* Error */}
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
          <TouchableOpacity onPress={loadInitial} style={{ marginTop: 8 }}>
            <Text style={{ color: Colors.blue, fontSize: 13, fontWeight: "600" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Loading */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPost}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.green}
              colors={[Colors.green]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={Colors.green}
                style={{ paddingVertical: 20 }}
              />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 80,
                }}
              >
                <Text style={{ fontSize: 40, marginBottom: 12 }}>
                  {"📝"}
                </Text>
                <Text
                  style={{
                    color: Colors.textMuted,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  No posts yet
                </Text>
                <Text
                  style={{
                    color: Colors.textMuted,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  Be the first to write something!
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
