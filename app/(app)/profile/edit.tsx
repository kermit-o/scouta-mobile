import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getMyProfile, updateProfile, presignUpload } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts } from "@/lib/constants";

export default function EditProfileScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      setDisplayName(p.display_name || "");
      setBio(p.bio || "");
      setWebsite(p.website || "");
      setLocation(p.location || "");
      setInterests(p.interests || "");
      setAvatarUrl(p.avatar_url || "");
      setLoading(false);
    })();
  }, []);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const filename = asset.uri.split("/").pop() || "avatar.jpg";
      const presign = await presignUpload(filename, "image/jpeg", asset.fileSize || 500000);
      if (presign.upload_url) {
        const fileRes = await fetch(asset.uri);
        const blob = await fileRes.blob();
        await fetch(presign.upload_url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
        setAvatarUrl(presign.public_url);
      }
    } catch { Alert.alert("Error", "Failed to upload avatar"); }
    setUploadingAvatar(false);
  }

  async function handleSave() {
    setSaving(true);
    await updateProfile({ display_name: displayName, bio, website, location, interests, avatar_url: avatarUrl });
    await refreshUser();
    setSaving(false);
    router.back();
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={Colors.green} /></View>;

  const inputStyle = { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 12, fontSize: 14, marginBottom: 16 };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 16 }}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 24 }}>Edit Profile</Text>

      {/* Avatar */}
      <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: "center", marginBottom: 24 }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.card }} />
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.green + "33", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: Colors.green, fontSize: 28, fontWeight: "700" }}>{(displayName || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {uploadingAvatar && <ActivityIndicator color={Colors.green} style={{ position: "absolute", top: 28, left: 28 }} />}
        <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 10, textAlign: "center", marginTop: 6 }}>Change photo</Text>
      </TouchableOpacity>

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>DISPLAY NAME</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} style={inputStyle} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>BIO</Text>
      <TextInput value={bio} onChangeText={setBio} multiline numberOfLines={3} textAlignVertical="top" style={{ ...inputStyle, minHeight: 80 }} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>WEBSITE</Text>
      <TextInput value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" style={inputStyle} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>LOCATION</Text>
      <TextInput value={location} onChangeText={setLocation} placeholder="City, Country" placeholderTextColor={Colors.textMuted} style={inputStyle} />

      <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>INTERESTS (comma separated)</Text>
      <TextInput value={interests} onChangeText={setInterests} placeholder="AI, philosophy, tech" placeholderTextColor={Colors.textMuted} style={inputStyle} />

      <TouchableOpacity onPress={handleSave} disabled={saving}
        style={{ backgroundColor: Colors.green, padding: 16, alignItems: "center", opacity: saving ? 0.5 : 1 }}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontFamily: Fonts.mono, fontSize: 13, letterSpacing: 1 }}>SAVE CHANGES</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
