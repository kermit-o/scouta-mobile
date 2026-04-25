import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { createPost, presignUpload } from "@/lib/api";

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function pickMedia() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setMediaType(asset.type === "video" ? "video" : "image");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick media.");
    }
  }

  function removeMedia() {
    setMediaUri(null);
    setMediaType(null);
    setUploadProgress(0);
  }

  async function uploadMedia(): Promise<string | null> {
    if (!mediaUri || !token) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      const ext = mediaUri.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
      const filename = `post_${Date.now()}.${ext}`;
      const contentType = mediaType === "video" ? `video/${ext}` : `image/${ext}`;

      const presigned = await presignUpload(filename, contentType, token);

      setUploadProgress(30);

      const response = await fetch(mediaUri);
      const blob = await response.blob();

      setUploadProgress(50);

      await fetch(presigned.upload_url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      setUploadProgress(100);
      return presigned.file_url;
    } catch (e: any) {
      throw new Error("Failed to upload media: " + (e?.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!token) {
      setError("You must be signed in to post.");
      return;
    }

    setPublishing(true);
    try {
      let mediaUrl: string | null = null;

      if (mediaUri) {
        mediaUrl = await uploadMedia();
      }

      const postType = mediaType === "video" ? "video" : mediaUri ? "image" : "article";

      const newPost = await createPost(
        {
          title: title.trim(),
          content: body.trim(),
          post_type: postType,
          media_url: mediaUrl,
        },
        token
      );

      router.replace(`/(app)/post/${newPost.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
          Create Post
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View
            style={{
              backgroundColor: "rgba(238,68,68,0.1)",
              borderWidth: 1,
              borderColor: Colors.red,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* Title */}
        <Text
          style={{
            color: Colors.textSecondary,
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: 1,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          TITLE *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What's on your mind?"
          placeholderTextColor={Colors.textMuted}
          style={{
            backgroundColor: Colors.inputBg,
            borderWidth: 1,
            borderColor: Colors.inputBorder,
            borderRadius: 8,
            padding: 14,
            color: Colors.text,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 16,
          }}
        />

        {/* Body */}
        <Text
          style={{
            color: Colors.textSecondary,
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: 1,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          BODY
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your post content... (markdown supported)"
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
          style={{
            backgroundColor: Colors.inputBg,
            borderWidth: 1,
            borderColor: Colors.inputBorder,
            borderRadius: 8,
            padding: 14,
            color: Colors.text,
            fontSize: 15,
            minHeight: 160,
            marginBottom: 16,
            lineHeight: 22,
          }}
        />

        {/* Media picker */}
        {mediaUri ? (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 11,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  flex: 1,
                }}
              >
                {mediaType === "video" ? "VIDEO" : "IMAGE"} ATTACHED
              </Text>
              <TouchableOpacity onPress={removeMedia}>
                <Ionicons name="close-circle" size={22} color={Colors.red} />
              </TouchableOpacity>
            </View>
            {mediaType === "image" ? (
              <Image
                source={{ uri: mediaUri }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 8,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 120,
                  backgroundColor: Colors.card,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Ionicons name="videocam" size={32} color={Colors.textMuted} />
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  Video selected
                </Text>
              </View>
            )}
            {uploading ? (
              <View
                style={{
                  marginTop: 8,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: Colors.border,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${uploadProgress}%`,
                    height: "100%",
                    backgroundColor: Colors.green,
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            onPress={pickMedia}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 8,
              borderStyle: "dashed",
              padding: 20,
              marginBottom: 16,
              gap: 8,
            }}
          >
            <Ionicons name="camera-outline" size={22} color={Colors.textMuted} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
              Attach image or video
            </Text>
          </TouchableOpacity>
        )}

        {/* Publish */}
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing || uploading}
          style={{
            backgroundColor: Colors.green,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            opacity: publishing || uploading ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {publishing || uploading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={Colors.white} />
              <Text style={{ color: Colors.white, fontSize: 14 }}>
                {uploading ? "Uploading..." : "Publishing..."}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: Colors.white,
                fontSize: 15,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              PUBLISH
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
