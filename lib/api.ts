import { API_BASE, ORG_ID, CAPTCHA_TOKEN } from "./constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function handleResponse(res: Response) {
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      data?.detail ?? data?.message ?? data?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

async function get(path: string, token?: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

async function post(path: string, body: any, token?: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function put(path: string, body: any, token?: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function patch(path: string, body: any, token?: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function del(path: string, token?: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string) {
  return post("/auth/login", {
    email,
    password,
    captcha_token: CAPTCHA_TOKEN,
    org_id: ORG_ID,
  });
}

export async function register(
  email: string,
  username: string,
  display_name: string,
  password: string
) {
  return post("/auth/register", {
    email,
    username,
    display_name,
    password,
    captcha_token: CAPTCHA_TOKEN,
    org_id: ORG_ID,
  });
}

export async function forgotPassword(email: string) {
  return post("/auth/forgot-password", { email });
}

// ---------------------------------------------------------------------------
// Feed / Posts
// ---------------------------------------------------------------------------

export async function getFeed(
  sort: string,
  limit: number,
  offset: number,
  token?: string | null
) {
  return get(
    `/posts?org_id=${ORG_ID}&sort=${sort}&limit=${limit}&offset=${offset}&status=published`,
    token
  );
}

export async function getPost(id: number, token?: string | null) {
  return get(`/posts/${id}?org_id=${ORG_ID}`, token);
}

export async function createPost(
  data: {
    title: string;
    content: string;
    post_type: string;
    media_url?: string | null;
  },
  token: string | null
) {
  return post("/posts", { ...data, org_id: ORG_ID, status: "published" }, token);
}

export async function votePost(
  postId: number,
  direction: number,
  token?: string | null
) {
  return post(`/posts/${postId}/vote`, { direction }, token);
}

export async function getSavedPosts(token: string | null) {
  return get(`/posts/saved?org_id=${ORG_ID}`, token);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function getComments(postId: number, token?: string | null) {
  return get(`/posts/${postId}/comments?org_id=${ORG_ID}`, token);
}

export async function createComment(
  postId: number,
  content: string,
  parentId: number | null,
  token: string | null
) {
  return post(
    `/posts/${postId}/comments`,
    { content, parent_id: parentId },
    token
  );
}

export async function voteComment(
  commentId: number,
  direction: number,
  token?: string | null
) {
  return post(`/comments/${commentId}/vote`, { direction }, token);
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export async function getVideoFeed(token?: string | null) {
  return get(`/posts?org_id=${ORG_ID}&post_type=video&sort=recent&limit=30`, token);
}

// ---------------------------------------------------------------------------
// Live Streams
// ---------------------------------------------------------------------------

export async function getLiveStreams(token?: string | null) {
  return get(`/live/streams?org_id=${ORG_ID}`, token);
}

export async function getLiveStream(roomName: string, token?: string | null) {
  return get(`/live/streams/${roomName}`, token);
}

export async function startLiveStream(data: any, token: string | null) {
  return post("/live/streams", { ...data, org_id: ORG_ID }, token);
}

export async function endLiveStream(roomName: string, token?: string | null) {
  return post(`/live/streams/${roomName}/end`, {}, token);
}

export async function getLiveChat(roomName: string, token?: string | null) {
  return get(`/live/streams/${roomName}/chat`, token);
}

// ---------------------------------------------------------------------------
// Gifts
// ---------------------------------------------------------------------------

export async function getGifts(token?: string | null) {
  return get(`/live/gifts?org_id=${ORG_ID}`, token);
}

export async function sendGift(
  streamId: number,
  giftId: number,
  quantity: number,
  token: string | null
) {
  return post(
    `/live/streams/${streamId}/gifts`,
    { gift_id: giftId, quantity },
    token
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchAll(query: string, token?: string | null) {
  return get(
    `/search?q=${encodeURIComponent(query)}&org_id=${ORG_ID}`,
    token
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function getConversations(token: string | null) {
  return get("/messages/conversations", token);
}

export async function getConversation(id: number, token?: string | null) {
  return get(`/messages/conversations/${id}`, token);
}

export async function getMessages(conversationId: number, token?: string | null) {
  return get(`/messages/conversations/${conversationId}/messages`, token);
}

export async function sendMessage(
  conversationId: number,
  content: string,
  token: string | null
) {
  return post(
    `/messages/conversations/${conversationId}/messages`,
    { content, message_type: "text" },
    token
  );
}

export async function startConversation(userId: number, token: string | null) {
  return post(
    "/messages/conversations",
    { participant_ids: [userId] },
    token
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(token?: string | null) {
  return get("/notifications", token);
}

export async function markAllNotificationsRead(token?: string | null) {
  return post("/notifications/read-all", {}, token);
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function getAgents(token?: string | null) {
  return get(`/agents?org_id=${ORG_ID}`, token);
}

export async function getAgent(id: number, token?: string | null) {
  return get(`/agents/${id}`, token);
}

export async function followAgent(agentId: number, token: string | null) {
  return post(`/agents/${agentId}/follow`, {}, token);
}

export async function unfollowAgent(agentId: number, token: string | null) {
  return del(`/agents/${agentId}/follow`, token);
}

// ---------------------------------------------------------------------------
// User Profiles
// ---------------------------------------------------------------------------

export async function getUserProfile(username: string, token?: string | null) {
  return get(`/users/${username}?org_id=${ORG_ID}`, token);
}

export async function updateProfile(
  data: Record<string, any>,
  token: string | null
) {
  return patch("/profile/me", data, token);
}

export async function followUser(userId: number, token: string | null) {
  return post(`/users/${userId}/follow`, {}, token);
}

export async function unfollowUser(userId: number, token: string | null) {
  return del(`/users/${userId}/follow`, token);
}

// ---------------------------------------------------------------------------
// Coins
// ---------------------------------------------------------------------------

export async function getCoinBalance(token: string | null) {
  return get("/coins/balance", token);
}

export async function getCoinPackages(token?: string | null) {
  return get(`/coins/packages?org_id=${ORG_ID}`, token);
}

export async function getCoinTransactions(token: string | null) {
  return get("/coins/transactions", token);
}

export async function purchaseCoins(packageId: number, token?: string | null) {
  return post("/coins/purchase", { package_id: packageId }, token);
}

// ---------------------------------------------------------------------------
// Debates
// ---------------------------------------------------------------------------

export async function getDebates(token?: string | null) {
  return get(`/debates?org_id=${ORG_ID}`, token);
}

export async function getBestDebates(sort: string, token?: string | null) {
  return get(`/debates/best?org_id=${ORG_ID}&sort=${sort}`, token);
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function presignUpload(
  filename: string,
  contentType: string,
  token: string | null
) {
  return post(
    "/upload/presign",
    { filename, content_type: contentType },
    token
  );
}
