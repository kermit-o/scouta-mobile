import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Colors, Fonts, API_BASE } from "@/lib/constants";
import { getToken } from "@/lib/auth";

function guessContentType(uri: string, isVideo: boolean): string {
  const ext = (uri.split("?")[0].split(".").pop() || "").toLowerCase();
  if (isVideo) {
    if (ext === "mov") return "video/quicktime";
    if (ext === "webm") return "video/webm";
    if (ext === "m4v") return "video/x-m4v";
    return "video/mp4";
  }
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

export default function CreatePostScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets[0]) return;
    const asset = result.assets[0];
    setMediaUri(asset.uri);
    setError("");
    setUploading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError("Not authenticated. Please log in again.");
        setMediaUri(null);
        setUploading(false);
        return;
      }
      const isVideo = asset.type === "video";
      const contentType = guessContentType(asset.uri, isVideo);
      const filename =
        (asset as any).fileName ||
        asset.uri.split("/").pop() ||
        `upload.${isVideo ? "mp4" : "jpg"}`;

      let sizeBytes = asset.fileSize || 0;
      try {
        const info: any = await FileSystem.getInfoAsync(asset.uri, { size: true });
        if (info.exists && info.size) sizeBytes = info.size;
      } catch (e) { console.log("[upload] getInfoAsync failed", e); }

      console.log("[upload] presigning", { filename, contentType, sizeBytes });
      const presignRes = await fetch(`${API_BASE}/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename, content_type: contentType, size_bytes: sizeBytes }),
      });
      const presignText = await presignRes.text();
      console.log("[upload] presign status", presignRes.status, presignText.slice(0, 300));
      let presign: any = {};
      try { presign = JSON.parse(presignText); } catch { presign = { detail: presignText }; }
      if (!presignRes.ok || !presign.upload_url) {
        const detail = typeof presign.detail === "string"
          ? presign.detail
          : JSON.stringify(presign.detail || presign).slice(0, 200);
        setError(`Presign failed (HTTP ${presignRes.status}): ${detail || "no upload_url"}`);
        setMediaUri(null);
        setUploading(false);
        return;
      }

      console.log("[upload] PUT", presign.upload_url.slice(0, 120) + "...");
      const uploadRes = await FileSystem.uploadAsync(presign.upload_url, asset.uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": contentType },
      });
      console.log("[upload] R2 status", uploadRes.status, (uploadRes.body || "").slice(0, 300));
      if (uploadRes.status < 200 || uploadRes.status >= 300) {
        setError(`Upload failed (HTTP ${uploadRes.status}): ${(uploadRes.body || "no body").slice(0, 200)}`);
        setMediaUri(null);
        setUploading(false);
        return;
      }
      setMediaUrl(presign.public_url);
      setMediaType(isVideo ? "video" : "image");
    } catch (e: any) {
      console.log("[upload] exception", e);
      setError(`Upload error: ${e?.message || "unknown"}`);
      setMediaUri(null);
    }
    setUploading(false);
  }

  async function handlePublish() {
    if (!title.trim()) return;
    setPublishing(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/posts/human`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          body_md: body.trim(),
          excerpt: body.trim().slice(0, 200),
          media_url: mediaUrl || null,
          media_type: mediaType || null,
        }),
      });
      const text = await res.text();
      console.log("[publish] status", res.status, text.slice(0, 300));
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
      if (!res.ok || !data.id) {
        const detail = typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail || data).slice(0, 200);
        setError(`HTTP ${res.status}: ${detail || "Failed to publish"}`);
        setPublishing(false);
        return;
      }
      router.replace(`/(app)/post/${data.id}`);
    } catch (e: any) {
      console.log("[publish] exception", e);
      setError(`Network error: ${e?.message || "unknown"}`);
    }
    setPublishing(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 16 }}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 20 }}>Create Post</Text>

      {error ? <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>TITLE *</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Post title" placeholderTextColor={Colors.textMuted}
        style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 16, marginBottom: 16 }} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>BODY</Text>
      <TextInput value={body} onChangeText={setBody} placeholder="Write your post..." placeholderTextColor={Colors.textMuted}
        multiline numberOfLines={8} textAlignVertical="top"
        style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 14, marginBottom: 16, minHeight: 160 }} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>MEDIA (optional)</Text>
      {mediaUri ? (
        <View style={{ marginBottom: 16 }}>
          <Image source={{ uri: mediaUri }} style={{ width: "100%", height: 200, borderRadius: 4, backgroundColor: Colors.card }} resizeMode="cover" />
          {uploading && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.green} /><Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 11, marginTop: 8 }}>Uploading...</Text>
          </View>}
          <TouchableOpacity onPress={() => { setMediaUri(null); setMediaUrl(null); setMediaType(null); }} style={{ marginTop: 8 }}>
            <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 11 }}>Remove media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={pickMedia}
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed", padding: 24, alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 24, marginBottom: 4 }}>[+]</Text>
          <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 12 }}>Attach image or video</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handlePublish} disabled={publishing || !title.trim() || uploading}
        style={{ backgroundColor: Colors.green, padding: 16, alignItems: "center", opacity: publishing || !title.trim() || uploading ? 0.5 : 1 }}>
        {publishing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 13, letterSpacing: 1 }}>PUBLISH</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
