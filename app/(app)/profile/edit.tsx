import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { updateProfile, presignUpload } from "@/lib/api";
import { getInitial } from "@/lib/utils";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, setSession } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function pickAvatar() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image.");
    }
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarUri || !token) return null;
    try {
      const ext = avatarUri.split(".").pop() || "jpg";
      const filename = `avatar_${Date.now()}.${ext}`;
      const contentType = `image/${ext}`;

      const presigned = await presignUpload(filename, contentType, token);

      const response = await fetch(avatarUri);
      const blob = await response.blob();

      await fetch(presigned.upload_url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      return presigned.file_url;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    setError("");
    if (!token) return;
    setSaving(true);
    try {
      let avatarUrl: string | null | undefined = undefined;
      if (avatarUri) {
        avatarUrl = await uploadAvatar();
      }

      const payload: Record<string, any> = {
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      };
      if (website.trim()) payload.website = website.trim();
      if (location.trim()) payload.location = location.trim();
      if (interests.trim()) payload.interests = interests.trim();
      if (avatarUrl) payload.avatar_url = avatarUrl;

      const updated = await updateProfile(payload, token);
      if (updated) {
        await setSession(token, updated);
      }
      router.back();
    } catch (e: any) {
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle = {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "monospace" as const,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase" as const,
  };

  const inputStyle = {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 16,
  };

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
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600" }}>
          Edit Profile
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

        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={pickAvatar}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: Colors.green,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(74,154,74,0.3)",
              }}
            >
              <Text
                style={{ color: Colors.white, fontSize: 28, fontWeight: "700" }}
              >
                {getInitial(displayName || user?.display_name || user?.username || null)}
              </Text>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: Colors.card,
                borderWidth: 2,
                borderColor: Colors.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera" size={14} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          {avatarUri ? (
            <Text
              style={{ color: Colors.green, fontSize: 12, marginTop: 8 }}
            >
              New photo selected
            </Text>
          ) : null}
        </View>

        <Text style={labelStyle}>DISPLAY NAME</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your display name"
          placeholderTextColor={Colors.textMuted}
          style={inputStyle}
        />

        <Text style={labelStyle}>BIO</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself"
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
          style={{ ...inputStyle, minHeight: 80 }}
        />

        <Text style={labelStyle}>WEBSITE</Text>
        <TextInput
          value={website}
          onChangeText={setWebsite}
          placeholder="https://yoursite.com"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={inputStyle}
        />

        <Text style={labelStyle}>LOCATION</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="City, Country"
          placeholderTextColor={Colors.textMuted}
          style={inputStyle}
        />

        <Text style={labelStyle}>INTERESTS</Text>
        <TextInput
          value={interests}
          onChangeText={setInterests}
          placeholder="AI, sports, tech..."
          placeholderTextColor={Colors.textMuted}
          style={inputStyle}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: Colors.green,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            opacity: saving ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text
              style={{
                color: Colors.white,
                fontSize: 15,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              SAVE CHANGES
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
