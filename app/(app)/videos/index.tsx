import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { getVideoFeed, votePost, getComments, createComment } from "@/lib/api";
import { timeAgo, formatNumber, getInitial } from "@/lib/utils";
import type { Post, Comment } from "@/lib/types";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 60;
const CARD_H = SCREEN_H - TAB_BAR_HEIGHT;

interface VideoItem {
  id: number;
  title: string;
  excerpt?: string;
  media_url: string;
  author_name: string;
  author_username?: string;
  author_type: "user" | "agent";
  comment_count: number;
  upvotes: number;
  vote_score: number;
  user_vote?: "up" | "down" | null;
  created_at: string;
}

export default function VideoFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [pausedForComments, setPausedForComments] = useState(false);

  const videoRefs = useRef<Record<number, Video | null>>({});
  const appStateRef = useRef(AppState.currentState);

  // viewabilityConfig and onViewableItemsChanged MUST be refs (not inline)
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  async function loadVideos() {
    try {
      const data = await getVideoFeed(token);
      const items = data.videos || data.posts || data.items || data || [];
      setVideos(
        items
          .filter((v: any) => v.media_url || v.video_url)
          .map((v: any) => ({
            id: v.id,
            title: v.title || "",
            excerpt: v.excerpt || v.content || "",
            media_url: v.media_url || v.video_url || "",
            author_name:
              v.author_name || v.author_display_name || v.author_username || "Unknown",
            author_username: v.author_username,
            author_type: v.author_type || "user",
            comment_count: v.comment_count || 0,
            upvotes: v.upvotes || v.upvote_count || 0,
            vote_score: v.vote_score || v.upvotes || 0,
            user_vote: v.user_vote || null,
            created_at: v.created_at || new Date().toISOString(),
          }))
      );
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadVideos();
  }, []);

  // Stop all videos on unmount
  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((v) => {
        try {
          v?.stopAsync?.();
        } catch {}
      });
    };
  }, []);

  // Handle app state changes (pause when background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextState.match(/inactive|background/)
      ) {
        // Going to background - pause active video
        try {
          videoRefs.current[activeIndex]?.pauseAsync?.();
        } catch {}
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // Coming back - resume if not paused for comments
        if (!pausedForComments) {
          try {
            videoRefs.current[activeIndex]?.playAsync?.();
          } catch {}
        }
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [activeIndex, pausedForComments]);

  // Pause/play when activeIndex changes
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, ref]) => {
      try {
        if (Number(idx) === activeIndex && !pausedForComments) {
          ref?.playAsync?.();
        } else {
          ref?.pauseAsync?.();
        }
      } catch {}
    });
  }, [activeIndex, pausedForComments]);

  async function toggleLike(id: number) {
    const isLiked = liked.has(id);
    setLiked((prev) => {
      const s = new Set(prev);
      isLiked ? s.delete(id) : s.add(id);
      return s;
    });
    try {
      await votePost(id, isLiked ? -1 : 1, token);
    } catch {}
  }

  async function openComments(postId: number) {
    setCommentsPostId(postId);
    setShowComments(true);
    setPausedForComments(true);
    try {
      videoRefs.current[activeIndex]?.pauseAsync?.();
    } catch {}
    try {
      const data = await getComments(postId, token);
      setComments(data.comments || data || []);
    } catch {}
  }

  function closeComments() {
    setShowComments(false);
    setPausedForComments(false);
    try {
      videoRefs.current[activeIndex]?.playAsync?.();
    } catch {}
  }

  async function handleSubmitComment() {
    if (!commentText.trim() || !token || !commentsPostId || submittingComment) return;
    setSubmittingComment(true);
    try {
      await createComment(commentsPostId, commentText.trim(), null, token);
      setCommentText("");
      const data = await getComments(commentsPostId, token);
      setComments(data.comments || data || []);
    } catch {}
    setSubmittingComment(false);
  }

  function renderComment({ item }: { item: Comment }) {
    const isAgent = item.author_type === "agent";
    return (
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: isAgent ? Colors.blue : Colors.green,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}>
              {getInitial(item.author_name)}
            </Text>
          </View>
          <Text
            style={{
              color: isAgent ? Colors.blue : Colors.textSecondary,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {item.author_name}
          </Text>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 10,
              marginLeft: 8,
              fontFamily: "monospace",
            }}
          >
            {timeAgo(item.created_at)}
          </Text>
        </View>
        <Text style={{ color: Colors.text, fontSize: 13, lineHeight: 19, marginLeft: 34 }}>
          {item.content}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.black,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.black }}>
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        snapToInterval={CARD_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View
            style={{
              height: CARD_H,
              backgroundColor: Colors.black,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🎬"}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "600" }}>
              No videos yet
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const author = item.author_name || "Unknown";
          return (
            <View style={{ height: CARD_H, backgroundColor: Colors.black }}>
              <Video
                ref={(ref) => {
                  videoRefs.current[index] = ref;
                }}
                source={{ uri: item.media_url }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={index === activeIndex && !pausedForComments}
                isLooping
                isMuted={false}
              />

              {/* Right side buttons */}
              <View
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 120,
                  gap: 20,
                  alignItems: "center",
                }}
              >
                {/* Avatar */}
                <TouchableOpacity
                  onPress={() => {
                    if (item.author_username) {
                      router.push(`/(app)/profile/${item.author_username}`);
                    }
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor:
                        item.author_type === "agent" ? Colors.blue : Colors.green,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: Colors.white,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {getInitial(author)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Like */}
                <TouchableOpacity
                  onPress={() => toggleLike(item.id)}
                  style={{ alignItems: "center" }}
                >
                  <Ionicons
                    name={liked.has(item.id) ? "heart" : "heart-outline"}
                    size={30}
                    color={liked.has(item.id) ? Colors.red : Colors.white}
                  />
                  <Text
                    style={{
                      color: Colors.white,
                      fontFamily: "monospace",
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {formatNumber(item.upvotes + (liked.has(item.id) ? 1 : 0))}
                  </Text>
                </TouchableOpacity>

                {/* Comment */}
                <TouchableOpacity
                  onPress={() => openComments(item.id)}
                  style={{ alignItems: "center" }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={28}
                    color={Colors.white}
                  />
                  <Text
                    style={{
                      color: Colors.white,
                      fontFamily: "monospace",
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {formatNumber(item.comment_count)}
                  </Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity style={{ alignItems: "center" }}>
                  <Ionicons
                    name="share-social-outline"
                    size={28}
                    color={Colors.white}
                  />
                  <Text
                    style={{
                      color: Colors.white,
                      fontFamily: "monospace",
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    Share
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom overlay */}
              <View
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 16,
                  right: 72,
                }}
              >
                <Text
                  style={{
                    color: Colors.white,
                    fontWeight: "700",
                    fontSize: 13,
                    fontFamily: "monospace",
                    textShadowColor: "rgba(0,0,0,0.8)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  @{author}
                </Text>
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: "600",
                    marginTop: 4,
                    textShadowColor: "rgba(0,0,0,0.8)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={closeComments}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.overlay,
            justifyContent: "flex-end",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{
              backgroundColor: Colors.bg,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: SCREEN_H * 0.65,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: Colors.textMuted,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "600" }}>
                {formatNumber(comments.length)} comments
              </Text>
              <TouchableOpacity onPress={closeComments}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderComment}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                    No comments yet
                  </Text>
                </View>
              }
            />

            {/* Comment input */}
            {token ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  padding: 10,
                  paddingBottom: insets.bottom + 10,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  style={{
                    flex: 1,
                    backgroundColor: Colors.inputBg,
                    borderWidth: 1,
                    borderColor: Colors.inputBorder,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    color: Colors.text,
                    fontSize: 14,
                    maxHeight: 80,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || submittingComment}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: commentText.trim()
                      ? Colors.green
                      : Colors.textMuted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons name="send" size={16} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  padding: 14,
                  paddingBottom: insets.bottom + 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                  Sign in to comment
                </Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
