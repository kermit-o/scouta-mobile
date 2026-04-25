export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  role: "user" | "admin" | "moderator";
  is_verified: boolean;
  coin_balance: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  personality: string | null;
  expertise: string[];
  model: string | null;
  is_active: boolean;
  is_featured: boolean;
  follower_count: number;
  post_count: number;
  score: number;
  rank: number | null;
  created_at: string;
  updated_at: string;
  is_following?: boolean;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  post_type: "article" | "video" | "image" | "debate" | "poll" | "link";
  status: "published" | "draft" | "archived";
  media_url: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  link_url: string | null;
  author_type: "user" | "agent";
  author_id: number;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  agent_id: number | null;
  agent?: Agent;
  user?: User;
  category: string | null;
  tags: string[];
  upvotes: number;
  downvotes: number;
  vote_score: number;
  comment_count: number;
  view_count: number;
  share_count: number;
  is_featured: boolean;
  is_pinned: boolean;
  is_saved?: boolean;
  user_vote?: "up" | "down" | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  author_type: "user" | "agent";
  author_id: number;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  agent_id: number | null;
  upvotes: number;
  downvotes: number;
  vote_score: number;
  user_vote?: "up" | "down" | null;
  reply_count: number;
  replies: Comment[];
  created_at: string;
  updated_at: string;
}

export interface LiveStream {
  id: number;
  title: string;
  description: string | null;
  host_type: "user" | "agent";
  host_id: number;
  host_name: string;
  host_avatar: string | null;
  agent_id: number | null;
  status: "live" | "scheduled" | "ended";
  viewer_count: number;
  thumbnail_url: string | null;
  room_name: string;
  livekit_token: string | null;
  started_at: string | null;
  ended_at: string | null;
  scheduled_for: string | null;
  created_at: string;
}

export interface Gift {
  id: number;
  name: string;
  emoji: string;
  coin_cost: number;
  animation_url: string | null;
}

export interface GiftEvent {
  id: number;
  stream_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  gift: Gift;
  quantity: number;
  total_cost: number;
  created_at: string;
}

export interface TopGifter {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_coins: number;
  gift_count: number;
}

export interface CoinPackage {
  id: number;
  name: string;
  coins: number;
  price_cents: number;
  bonus_coins: number;
  is_featured: boolean;
  currency: string;
}

export interface CoinTransaction {
  id: number;
  user_id: number;
  type: "purchase" | "gift_sent" | "gift_received" | "reward" | "refund";
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  participants: ConversationParticipant[];
  last_message: Message | null;
  unread_count: number;
  is_group: boolean;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_agent: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  sender_type: "user" | "agent";
  content: string;
  message_type: "text" | "image" | "video" | "system";
  media_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  type: "comment" | "reply" | "vote" | "follow" | "mention" | "gift" | "stream" | "system";
  title: string;
  message: string;
  actor_name: string | null;
  actor_avatar: string | null;
  reference_type: string | null;
  reference_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface SearchResult {
  type: "post" | "agent" | "user";
  id: number;
  title: string;
  subtitle: string | null;
  avatar_url: string | null;
  slug: string | null;
}

export interface Debate {
  id: number;
  title: string;
  topic: string;
  status: "pending" | "active" | "completed";
  agent_a_id: number;
  agent_b_id: number;
  agent_a?: Agent;
  agent_b?: Agent;
  winner_id: number | null;
  vote_count_a: number;
  vote_count_b: number;
  rounds: DebateRound[];
  created_at: string;
}

export interface DebateRound {
  round_number: number;
  agent_a_argument: string;
  agent_b_argument: string;
  created_at: string;
}

export interface VideoFeedItem {
  id: number;
  post: Post;
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  view_count: number;
}

export interface FeedResponse {
  posts: Post[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface PresignedUpload {
  upload_url: string;
  file_url: string;
  fields: Record<string, string>;
}

export interface EarningsSummary {
  total_earned: number;
  this_month: number;
  available_balance: number;
  pending: number;
}
