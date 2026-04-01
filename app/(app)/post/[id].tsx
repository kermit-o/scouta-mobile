import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getPost, getComments, createComment, votePost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts } from "@/lib/constants";
import type { Post, Comment } from "@/lib/types";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [userVote, setUserVote] = useState(0);
  const postId = Number(id);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([getPost(postId), getComments(postId)]);
        setPost(p);
        setComments(Array.isArray(c) ? c : c.comments || []);
      } catch {}
      setLoading(false);
    })();
  }, [postId]);

  async function handleVote(value: 1 | -1) {
    if (!token) return;
    setUserVote(prev => prev === value ? 0 : value);
    await votePost(postId, value);
  }

  async function handleComment() {
    if (!commentText.trim() || sending) return;
    setSending(true);
    const result = await createComment(postId, commentText.trim(), replyTo || undefined);
    if (result.id) { setComments(prev => [result, ...prev]); setCommentText(""); setReplyTo(null); }
    setSending(false);
  }

  function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return m + "m"; const h = Math.floor(m / 60); if (h < 24) return h + "h"; return Math.floor(h / 24) + "d"; }

  if (loading) return <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={Colors.green} /></View>;
  if (!post) return <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: Colors.red }}>Post not found</Text></View>;

  const rootComments = comments.filter(c => !c.parent_comment_id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 12 }}>{"< Back"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", lineHeight: 28, marginBottom: 12 }}>{post.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.mono, fontSize: 11 }}>{post.author_display_name || post.author_username || "Unknown"}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 10 }}>·</Text>
            <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10 }}>{timeAgo(post.created_at)}</Text>
          </View>
          {post.body_md ? <Text style={{ color: Colors.text, fontSize: 15, lineHeight: 22 }}>{post.body_md}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 16 }}>
          <TouchableOpacity onPress={() => handleVote(1)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 18, color: userVote === 1 ? Colors.green : Colors.textMuted }}>▲</Text>
            <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 13 }}>{(post.upvote_count || 0) + (userVote === 1 ? 1 : 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleVote(-1)}>
            <Text style={{ fontSize: 18, color: userVote === -1 ? Colors.red : Colors.textMuted }}>▼</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowComments(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 13 }}>{comments.length} comments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showComments} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <TouchableOpacity style={{ flex: 0.3 }} onPress={() => setShowComments(false)} />
          <KeyboardAvoidingView style={{ flex: 0.7, backgroundColor: Colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border }} /></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
              <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 16 }}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}><Text style={{ color: Colors.textMuted, fontSize: 18 }}>✕</Text></TouchableOpacity>
            </View>
            <FlatList data={rootComments} keyExtractor={item => String(item.id)} contentContainerStyle={{ padding: 16, gap: 12 }}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, textAlign: "center", marginTop: 40 }}>No comments yet</Text>}
              renderItem={({ item }) => {
                const isAgent = item.author_type === "agent";
                const replies = comments.filter(c => c.parent_comment_id === item.id);
                return (
                  <View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: isAgent ? 6 : 16, backgroundColor: isAgent ? Colors.blue + "33" : Colors.green + "33", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: isAgent ? Colors.blue : Colors.green, fontSize: 12, fontWeight: "700" }}>{(item.author_display_name || "?").charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: isAgent ? Colors.blue : Colors.text, fontFamily: Fonts.mono, fontSize: 11, fontWeight: "700" }}>{item.author_display_name || item.author_username}{isAgent ? " ⚡" : ""}</Text>
                          <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{timeAgo(item.created_at)}</Text>
                        </View>
                        <Text style={{ color: Colors.text, fontSize: 14, lineHeight: 20, marginTop: 4 }}>{item.body}</Text>
                        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
                          <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10 }}>▲ {item.upvotes || 0}</Text>
                          <TouchableOpacity onPress={() => setReplyTo(item.id)}><Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 10 }}>Reply</Text></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    {replies.map(r => (
                      <View key={r.id} style={{ flexDirection: "row", gap: 8, marginLeft: 42, marginTop: 8 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.green + "22", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: Colors.green, fontSize: 9, fontWeight: "700" }}>{(r.author_display_name || "?").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.mono, fontSize: 10 }}>{r.author_display_name || r.author_username}</Text>
                          <Text style={{ color: Colors.text, fontSize: 13, marginTop: 2 }}>{r.body}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }} />
            {token ? (
              <View style={{ flexDirection: "row", padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg }}>
                {replyTo && <TouchableOpacity onPress={() => setReplyTo(null)} style={{ position: "absolute", top: -24, left: 16, backgroundColor: Colors.blue + "22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 10 }}>Replying... ✕</Text></TouchableOpacity>}
                <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add a comment..." placeholderTextColor={Colors.textMuted}
                  style={{ flex: 1, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, fontSize: 14 }} />
                <TouchableOpacity onPress={handleComment} disabled={!commentText.trim() || sending}
                  style={{ backgroundColor: commentText.trim() ? Colors.green : Colors.border, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 16 }}>↑</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 16, alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.border }}>
                <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 12 }}>Sign in to comment</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
