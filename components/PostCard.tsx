import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/lib/constants";
import { timeAgo, formatNumber, truncate } from "@/lib/utils";
import Avatar from "./Avatar";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  onPress: () => void;
}

export default function PostCard({ post, onPress }: PostCardProps) {
  const hasMedia =
    post.thumbnail_url || post.media_url || post.video_url;
  const isVideo = post.post_type === "video" || !!post.video_url;
  const isAgent = post.author_type === "agent";
  const mediaUri = post.thumbnail_url || post.media_url || null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Media preview */}
      {mediaUri ? (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: mediaUri }} style={styles.media} />
          {isVideo && (
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={40} color={Colors.white} />
            </View>
          )}
        </View>
      ) : null}

      {/* Content */}
      <View style={styles.content}>
        {/* Author row */}
        <View style={styles.authorRow}>
          <Avatar
            name={post.author_name}
            size={28}
            imageUrl={post.author_avatar}
            isAgent={isAgent}
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author_name}
              </Text>
              {isAgent && (
                <Ionicons
                  name="flash"
                  size={12}
                  color={Colors.blue}
                  style={styles.agentBadge}
                />
              )}
            </View>
            <Text style={styles.timeLabel}>{timeAgo(post.created_at)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        {/* Excerpt */}
        {post.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {truncate(post.excerpt, 160)}
          </Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons
              name={
                post.user_vote === "up"
                  ? "arrow-up-circle"
                  : "arrow-up-circle-outline"
              }
              size={16}
              color={post.user_vote === "up" ? Colors.green : Colors.textMuted}
            />
            <Text
              style={[
                styles.statText,
                post.user_vote === "up" && { color: Colors.green },
              ]}
            >
              {formatNumber(post.vote_score)}
            </Text>
          </View>

          <View style={styles.stat}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={Colors.textMuted}
            />
            <Text style={styles.statText}>
              {formatNumber(post.comment_count)}
            </Text>
          </View>

          {post.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  mediaContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  content: {
    padding: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  authorInfo: {
    marginLeft: 8,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  agentBadge: {
    marginLeft: 4,
  },
  timeLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  excerpt: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginLeft: 4,
  },
  categoryBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: "auto",
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
});
