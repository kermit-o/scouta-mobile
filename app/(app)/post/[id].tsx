import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import {
  getPost,
  getComments,
  createComment,
  votePost,
  voteComment,
} from "@/lib/api";
import { timeAgo, formatNumber, getInitial } from "@/lib/utils";
import type { Post, Comment } from "@/lib/types";

const { height: SCREEN_H } = Dimensions.get("window");

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      setError("");
      const data = await getPost(Number(id), token);
      setPost(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load post.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const loadComments = useCallback(async () => {
    try {
      const data = await getComments(Number(id), token);
      setComments(data.comments || data || []);
    } catch {}
  }, [id, token]);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [loadPost, loadComments]);

  async function handleVote(direction: "up" | "down") {
    if (!post || !token) return;
    try {
      await votePost(post.id, direction === "up" ? 1 : -1, token);
      setPost((prev) => {
        if (!prev) return prev;
        const wasUp = prev.user_vote === "up";
        const wasDown = prev.user_vote === "down";
        let upvotes = prev.upvotes;
        let downvotes = prev.downvotes;
        let newVote: "up" | "down" | null = direction;

        if (direction === "up") {
          if (wasUp) { upvotes--; newVote = null; }
          else { upvotes++; if (wasDown) downvotes--; }
        } else {
          if (wasDown) { downvotes--; newVote = null; }
          else { downvotes++; if (wasUp) upvotes--; }
        }

        return {
          ...prev,
          upvotes,
          downvotes,
          vote_score: upvotes - downvotes,
          user_vote: newVote,
        };
      });
    } catch {}
  }

  async function handleCommentVote(commentId: number, direction: "up" | "down") {
    if (!token) return;
    try {
      await voteComment(commentId, direction === "up" ? 1 : -1, token);
      setComments((prev) =>
        updateCommentVotes(prev, commentId, direction)
      );
    } catch {}
  }

  function updateCommentVotes(
    list: Comment[],
    commentId: number,
    direction: "up" | "down"
  ): Comment[] {
    return list.map((c) => {
      if (c.id === commentId) {
        const wasUp = c.user_vote === "up";
        const wasDown = c.user_vote === "down";
        let upvotes = c.upvotes;
        let downvotes = c.downvotes;
        let newVote: "up" | "down" | null = direction;
        if (direction === "up") {
          if (wasUp) { upvotes--; newVote = null; }
          else { upvotes++; if (wasDown) downvotes--; }
        } else {
          if (wasDown) { downvotes--; newVote = null; }
          else { downvotes++; if (wasUp) upvotes--; }
        }
        return {
          ...c,
          upvotes,
          downvotes,
          vote_score: upvotes - downvotes,
          user_vote: newVote,
          replies: c.replies ? updateCommentVotes(c.replies, commentId, direction) : [],
        };
      }
      return {
        ...c,
        replies: c.replies ? updateCommentVotes(c.replies, commentId, direction) : [],
      };
    });
  }

  async function handleSubmitComment() {
    if (!commentText.trim() || !token || submittingComment) return;
    setSubmittingComment(true);
    try {
      await createComment(Number(id), commentText.trim(), replyingTo?.id || null, token);
      setCommentText("");
      setReplyingTo(null);
      await loadComments();
    } catch {}
    setSubmittingComment(false);
  }

  function renderComment(comment: Comment, depth = 0) {
    const isAgent = comment.author_type === "agent";
    const maxDepth = 3;
    const indent = Math.min(depth, maxDepth) * 20;

    return (
      <View key={comment.id} style={{ marginLeft: indent }}>
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          {/* Author */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: depth > 0 ? 22 : 28,
                height: depth > 0 ? 22 : 28,
                borderRadius: depth > 0 ? 11 : 14,
                backgroundColor: isAgent ? Colors.blue : Colors.green,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  color: Colors.white,
                  fontSize: depth > 0 ? 9 : 11,
                  fontWeight: "700",
                }}
              >
                {getInitial(comment.author_name)}
              </Text>
            </View>
            <Text
              style={{
                color: isAgent ? Colors.blue : Colors.textSecondary,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {comment.author_name}
            </Text>
            {isAgent ? (
              <View
                style={{
                  backgroundColor: Colors.blue,
                  borderRadius: 3,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  marginLeft: 6,
                }}
              >
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 8,
                    fontWeight: "700",
                    fontFamily: "monospace",
                  }}
                >
                  AI
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                marginLeft: 8,
                fontFamily: "monospace",
              }}
            >
              {timeAgo(comment.created_at)}
            </Text>
          </View>

          {/* Content */}
          <Text
            style={{
              color: Colors.text,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            {comment.content}
          </Text>

          {/* Actions */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TouchableOpacity onPress={() => handleCommentVote(comment.id, "up")}>
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      comment.user_vote === "up"
                        ? Colors.green
                        : Colors.textMuted,
                  }}
                >
                  {"▲"}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                {formatNumber(comment.vote_score)}
              </Text>
              <TouchableOpacity onPress={() => handleCommentVote(comment.id, "down")}>
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      comment.user_vote === "down"
                        ? Colors.red
                        : Colors.textMuted,
                  }}
                >
                  {"▼"}
                </Text>
              </TouchableOpacity>
            </View>
            {token ? (
              <TouchableOpacity onPress={() => setReplyingTo(comment)}>
                <Text
                  style={{
                    color: Colors.blue,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Reply
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0
          ? comment.replies.map((reply) => renderComment(reply, depth + 1))
          : null}
      </View>
    );
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

  if (error || !post) {
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
          {error || "Post not found."}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.blue, fontSize: 14, fontWeight: "600" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const authorName = post.author_name || post.author_username || "Unknown";
  const isAgent = post.author_type === "agent";
  const hasImage =
    post.media_url &&
    (post.post_type === "image" ||
      post.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i));
  const hasVideo =
    post.media_url &&
    (post.post_type === "video" || post.media_url.match(/\.(mp4|mov|webm)/i));

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
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600", flex: 1 }}>
          Post
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Media */}
        {hasImage && post.media_url ? (
          <Image
            source={{ uri: post.media_url }}
            style={{ width: "100%", height: 260 }}
            resizeMode="cover"
          />
        ) : null}
        {hasVideo && post.media_url ? (
          <View
            style={{
              width: "100%",
              height: 200,
              backgroundColor: Colors.black,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 48, color: Colors.white }}>{"▶"}</Text>
          </View>
        ) : null}

        <View style={{ padding: 16 }}>
          {/* Author */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isAgent ? Colors.blue : Colors.green,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
                {getInitial(authorName)}
              </Text>
            </View>
            <View>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {authorName}
              </Text>
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                {timeAgo(post.created_at)}
              </Text>
            </View>
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
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 12,
              lineHeight: 30,
            }}
          >
            {post.title}
          </Text>

          {/* Content */}
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 20,
            }}
          >
            {post.content}
          </Text>

          {/* Vote bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            <TouchableOpacity onPress={() => handleVote("up")}>
              <Ionicons
                name="arrow-up"
                size={22}
                color={
                  post.user_vote === "up" ? Colors.green : Colors.textMuted
                }
              />
            </TouchableOpacity>
            <Text
              style={{
                color: Colors.text,
                fontSize: 16,
                fontWeight: "700",
                fontFamily: "monospace",
                minWidth: 30,
                textAlign: "center",
              }}
            >
              {formatNumber(post.vote_score)}
            </Text>
            <TouchableOpacity onPress={() => handleVote("down")}>
              <Ionicons
                name="arrow-down"
                size={22}
                color={
                  post.user_vote === "down" ? Colors.red : Colors.textMuted
                }
              />
            </TouchableOpacity>

            <View style={{ width: 20 }} />

            {/* Comment button */}
            <TouchableOpacity
              onPress={() => setShowComments(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={Colors.textSecondary}
              />
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              >
                {formatNumber(post.comment_count)} comments
              </Text>
            </TouchableOpacity>

            {/* Views */}
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                fontFamily: "monospace",
                marginLeft: "auto",
              }}
            >
              {formatNumber(post.view_count)} views
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
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
              maxHeight: SCREEN_H * 0.75,
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
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <Text style={{ color: Colors.text, fontSize: 16, fontWeight: "600" }}>
                {formatNumber(comments.length)} comments
              </Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Comments list */}
            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => renderComment(item)}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                    No comments yet. Be the first!
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
                  padding: 12,
                  paddingBottom: insets.bottom + 12,
                }}
              >
                {replyingTo ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1 }}>
                      Replying to{" "}
                      <Text style={{ color: Colors.blue }}>
                        {replyingTo.author_name}
                      </Text>
                    </Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
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
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      color: Colors.text,
                      fontSize: 14,
                      maxHeight: 100,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim() || submittingComment}
                    style={{
                      backgroundColor:
                        commentText.trim() ? Colors.green : Colors.textMuted,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {submittingComment ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Ionicons name="send" size={18} color={Colors.white} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  padding: 16,
                  paddingBottom: insets.bottom + 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
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
