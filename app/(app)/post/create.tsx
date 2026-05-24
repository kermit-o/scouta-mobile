import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors, Fonts, API_BASE } from "@/lib/constants";
import { getToken } from "@/lib/auth";
import { BackButton, Button, Field } from "@/components/ui";

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
    var result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets[0]) return;
    var asset = result.assets[0];
    setMediaUri(asset.uri);
    setUploading(true);
    try {
      var token = await getToken();
      var filename = asset.uri.split("/").pop() || "upload.jpg";
      var isVideo = asset.type === "video";
      var contentType = isVideo ? "video/mp4" : "image/jpeg";
      var sizeBytes = asset.fileSize || 1000000;
      // Get presigned URL
      var presignRes = await fetch(API_BASE + "/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ filename: filename, content_type: contentType, size_bytes: sizeBytes }),
      });
      var presign = await presignRes.json();
      if (presign.upload_url) {
        // Upload file to R2
        var fileRes = await fetch(asset.uri);
        var blob = await fileRes.blob();
        await fetch(presign.upload_url, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
        setMediaUrl(presign.public_url);
        setMediaType(isVideo ? "video" : "image");
      } else {
        setError("Upload failed");
        setMediaUri(null);
      }
    } catch (e) {
      setError("Upload failed");
      setMediaUri(null);
    }
    setUploading(false);
  }

  async function handlePublish() {
    if (!title.trim()) return;
    setPublishing(true);
    setError("");
    try {
      var token = await getToken();
      var res = await fetch(API_BASE + "/posts/human", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          title: title.trim(),
          body_md: body.trim(),
          excerpt: body.trim().slice(0, 200),
          media_url: mediaUrl || null,
          media_type: mediaType || null,
        }),
      });
      var data = await res.json();
      if (data.id) {
        router.replace("/(app)/post/" + data.id);
      } else {
        setError(data.detail || "Failed to publish");
      }
    } catch { setError("Network error"); }
    setPublishing(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <BackButton style={{ marginBottom: 12 }} />
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 20 }}>Create Post</Text>

      {error ? <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}

      <Field label="TITLE *" value={title} onChangeText={setTitle} placeholder="Post title" style={{ fontSize: 16 }} />

      <Field label="BODY" value={body} onChangeText={setBody} placeholder="Write your post..."
        multiline numberOfLines={8} textAlignVertical="top" style={{ fontSize: 14, minHeight: 160 }} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>MEDIA (optional)</Text>
      {mediaUri ? (
        <View style={{ marginBottom: 16 }}>
          <Image source={{ uri: mediaUri }} style={{ width: "100%", height: 200, borderRadius: 4, backgroundColor: Colors.card }} resizeMode="cover" />
          {uploading && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.green} /><Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 11, marginTop: 8 }}>Uploading...</Text>
          </View>}
          <TouchableOpacity onPress={function() { setMediaUri(null); setMediaUrl(null); setMediaType(null); }} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="trash-outline" size={13} color={Colors.red} />
            <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 11 }}>Remove media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={pickMedia}
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed", padding: 24, alignItems: "center", marginBottom: 16, gap: 8 }}>
          <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
          <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 12 }}>Attach image or video</Text>
        </TouchableOpacity>
      )}

      <Button label="PUBLISH" onPress={handlePublish} loading={publishing} disabled={!title.trim() || uploading} icon="send" />
    </ScrollView>
  );
}
