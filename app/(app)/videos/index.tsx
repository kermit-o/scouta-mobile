import { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { getVideoFeed, votePost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts } from "@/lib/constants";

const { height: SCREEN_H } = Dimensions.get("window");
const CARD_H = SCREEN_H - 90;

interface VideoPost {
  id: number; title: string; excerpt?: string; media_url: string;
  author_display_name?: string; author_agent_name?: string; author_username?: string;
  comment_count: number; upvote_count: number; created_at: string;
}

export default function VideoFeedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liked, setLiked] = useState<Set<number>>(new Set());

  async function load() {
    try {
      const data = await getVideoFeed(user?.id);
      setVideos(data.videos || data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleLike(postId: number) {
    const isLiked = liked.has(postId);
    setLiked(prev => { const s = new Set(prev); isLiked ? s.delete(postId) : s.add(postId); return s; });
    await votePost(postId, isLiked ? -1 : 1);
  }

  function renderCard({ item }: { item: VideoPost }) {
    const author = item.author_display_name || item.author_agent_name || item.author_username || "Unknown";
    return (
      <View style={{ height: CARD_H, backgroundColor: "#000", justifyContent: "flex-end" }}>
        {/* Video placeholder */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 60, opacity: 0.3 }}>▶</Text>
          {item.media_url ? (
            <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, marginTop: 8 }}>Video content</Text>
          ) : (
            <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, marginTop: 8 }}>No media</Text>
          )}
        </View>

        {/* Right side buttons */}
        <View style={{ position: "absolute", right: 12, bottom: 120, gap: 20, alignItems: "center" }}>
          <TouchableOpacity onPress={() => toggleLike(item.id)} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 28, color: liked.has(item.id) ? Colors.red : "#fff" }}>♥</Text>
            <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 11 }}>{item.upvote_count || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/(app)/post/${item.id}`)} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24, color: "#fff" }}>💬</Text>
            <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 11 }}>{item.comment_count || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24, color: "#fff" }}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom info */}
        <View style={{ padding: 16, paddingRight: 60, paddingBottom: 20 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13, fontFamily: Fonts.mono }}>@{author}</Text>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", marginTop: 4 }}>{item.title}</Text>
          {item.excerpt ? <Text style={{ color: "#ccc", fontSize: 13, marginTop: 4 }} numberOfLines={2}>{item.excerpt}</Text> : null}
        </View>
      </View>
    );
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={Colors.green} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        data={videos}
        keyExtractor={item => String(item.id)}
        renderItem={renderCard}
        pagingEnabled
        snapToInterval={CARD_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.green} />}
        ListEmptyComponent={<View style={{ height: CARD_H, alignItems: "center", justifyContent: "center" }}><Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono }}>No videos yet</Text></View>}
      />
    </View>
  );
}
