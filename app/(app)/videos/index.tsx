import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useRouter } from "expo-router";
import { getVideoFeed, votePost, getComments, createComment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts } from "@/lib/constants";
import type { Comment } from "@/lib/types";
import { useFocusEffect } from "expo-router";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const CARD_H = SCREEN_H - 80;

interface VideoPost {
  id: number; title: string; excerpt?: string; media_url: string;
  author_display_name?: string; author_agent_name?: string; author_username?: string;
  comment_count: number; upvote_count: number; created_at: string;
}

export default function VideoFeedScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [isFocused, setIsFocused] = useState(true);
  const videoRefs = useRef<Record<number, Video | null>>({});

  // Comments modal state
  const [showComments, setShowComments] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  async function load() {
    try {
      const data = await getVideoFeed(user?.id);
      const items = data.videos || data || [];
      setVideos(items.filter((v: any) => v.media_url));
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  // Pause all videos when screen loses focus
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        Object.values(videoRefs.current).forEach(v => v?.pauseAsync?.());
      };
    }, [])
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      // Pause all other videos
      Object.entries(videoRefs.current).forEach(([idx, ref]) => {
        if (Number(idx) !== newIndex) ref?.pauseAsync?.();
      });
      setActiveIndex(newIndex);
    }
  }, []);

  async function toggleLike(id: number) {
    const isLiked = liked.has(id);
    setLiked(prev => { const s = new Set(prev); isLiked ? s.delete(id) : s.add(id); return s; });
    await votePost(id, isLiked ? -1 : 1);
  }

  async function openComments(postId: number) {
    setCommentsPostId(postId);
    setShowComments(true);
    setLoadingComments(true);
    // Pause video when comments open
    videoRefs.current[activeIndex]?.pauseAsync?.();
    try {
      const data = await getComments(postId);
      setComments(Array.isArray(data) ? data : data.comments || []);
    } catch {}
    setLoadingComments(false);
  }

  function closeComments() {
    setShowComments(false);
    setCommentsPostId(null);
    setComments([]);
    setCommentText("");
    // Resume video
    if (isFocused) videoRefs.current[activeIndex]?.playAsync?.();
  }

  async function handleSendComment() {
    if (!commentText.trim() || !commentsPostId || sendingComment) return;
    setSendingComment(true);
    try {
      const result = await createComment(commentsPostId, commentText.trim());
      if (result.id) { setComments(prev => [result, ...prev]); setCommentText(""); }
    } catch {}
    setSendingComment(false);
  }

  function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return m + "m"; const h = Math.floor(m / 60); if (h < 24) return h + "h"; return Math.floor(h / 24) + "d"; }

  if (loading) return <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={Colors.green} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList data={videos} keyExtractor={item => String(item.id)} pagingEnabled snapToInterval={CARD_H}
        decelerationRate="fast" showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.green} />}
        ListEmptyComponent={<View style={{ height: CARD_H, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}><Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono }}>No videos yet</Text></View>}
        renderItem={({ item, index }) => {
          const author = item.author_display_name || item.author_agent_name || item.author_username || "Unknown";
          return (
            <View style={{ height: CARD_H, backgroundColor: "#000" }}>
              <Video ref={(ref) => { videoRefs.current[index] = ref; }} source={{ uri: item.media_url }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                resizeMode={ResizeMode.CONTAIN} shouldPlay={index === activeIndex && isFocused && !showComments} isLooping isMuted={false}
                onPlaybackStatusUpdate={(s: AVPlaybackStatus) => {}} />
              {/* Right side buttons */}
              <View style={{ position: "absolute", right: 8, bottom: 80, gap: 18, alignItems: "center" }}>
                {/* Avatar */}
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.green + "44", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.green }}>
                  <Text style={{ color: Colors.green, fontSize: 16, fontWeight: "700" }}>{(author || "?").charAt(0).toUpperCase()}</Text>
                </View>
                {/* Like */}
                <TouchableOpacity onPress={() => toggleLike(item.id)} style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 30 }}>{liked.has(item.id) ? "\u2764\uFE0F" : "\u{1F90D}"}</Text>
                  <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 11, marginTop: 2 }}>{(item.upvote_count || 0) + (liked.has(item.id) ? 1 : 0)}</Text>
                </TouchableOpacity>
                {/* Comments */}
                <TouchableOpacity onPress={() => openComments(item.id)} style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 26 }}>{"\ud83d\udcac"}</Text>
                  <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 11, marginTop: 2 }}>{item.comment_count || 0}</Text>
                </TouchableOpacity>
                {/* Share */}
                <TouchableOpacity style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 26 }}>{"\u27A1\uFE0F"}</Text>
                </TouchableOpacity>
              </View>
              {/* Bottom info */}
              <View style={{ position: "absolute", bottom: 16, left: 12, right: 64, paddingRight: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14, textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>@{author}</Text>
                <Text style={{ color: "#fff", fontSize: 14, marginTop: 4, textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }} numberOfLines={2}>{item.title}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Comments Bottom Sheet - Instagram/TikTok style */}
      <Modal visible={showComments} animationType="slide" transparent onRequestClose={closeComments}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 0.35 }} activeOpacity={1} onPress={closeComments} />
          <KeyboardAvoidingView style={{ flex: 0.65, backgroundColor: Colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}>
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border }} />
            </View>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border }}>
              <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "700" }}>{comments.length} comments</Text>
              <TouchableOpacity onPress={closeComments}><Text style={{ color: Colors.textMuted, fontSize: 22 }}>\u2715</Text></TouchableOpacity>
            </View>
            {/* Comments list */}
            {loadingComments ? <ActivityIndicator color={Colors.green} style={{ marginTop: 30 }} /> : (
              <FlatList data={comments.filter(c => !c.parent_comment_id)} keyExtractor={item => String(item.id)}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 16 }}
                ListEmptyComponent={<Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 30 }}>No comments yet. Be first!</Text>}
                renderItem={({ item }) => {
                  const isAgent = item.author_type === "agent";
                  const replies = comments.filter(c => c.parent_comment_id === item.id);
                  return (
                    <View>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isAgent ? Colors.blue + "33" : Colors.green + "22", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: isAgent ? Colors.blue : Colors.green, fontSize: 14, fontWeight: "700" }}>{(item.author_display_name || "?").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "600" }}>{item.author_display_name || item.author_username}{isAgent ? " \u26A1" : ""}</Text>
                            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{timeAgo(item.created_at)}</Text>
                          </View>
                          <Text style={{ color: Colors.text, fontSize: 14, lineHeight: 20, marginTop: 3 }}>{item.body}</Text>
                          <View style={{ flexDirection: "row", gap: 14, marginTop: 6 }}>
                            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>\u2665 {item.upvotes || 0}</Text>
                            <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>Reply</Text>
                          </View>
                        </View>
                      </View>
                      {replies.length > 0 && (
                        <View style={{ marginLeft: 46, marginTop: 10, gap: 10 }}>
                          {replies.slice(0, 3).map(r => (
                            <View key={r.id} style={{ flexDirection: "row", gap: 8 }}>
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.green + "22", alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: Colors.green, fontSize: 10, fontWeight: "700" }}>{(r.author_display_name || "?").charAt(0).toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600" }}>{r.author_display_name || r.author_username}</Text>
                                <Text style={{ color: Colors.text, fontSize: 13, marginTop: 1 }}>{r.body}</Text>
                              </View>
                            </View>
                          ))}
                          {replies.length > 3 && <Text style={{ color: Colors.textMuted, fontSize: 12, marginLeft: 36 }}>View {replies.length - 3} more replies</Text>}
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
            {/* Comment input */}
            {token ? (
              <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderTopWidth: 0.5, borderTopColor: Colors.border, backgroundColor: Colors.bg }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.green + "33", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: Colors.green, fontSize: 12, fontWeight: "700" }}>{((user?.display_name || user?.username || "?").charAt(0)).toUpperCase()}</Text>
                </View>
                <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add comment..." placeholderTextColor={Colors.textMuted}
                  style={{ flex: 1, backgroundColor: Colors.inputBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: Colors.text, fontSize: 14 }} />
                <TouchableOpacity onPress={handleSendComment} disabled={!commentText.trim() || sendingComment}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: commentText.trim() ? Colors.green : Colors.border, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>\u2191</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 14, alignItems: "center", borderTopWidth: 0.5, borderTopColor: Colors.border }}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Sign in to comment</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
