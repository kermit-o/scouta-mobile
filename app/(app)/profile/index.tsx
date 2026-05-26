import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMyProfile, deleteAccount } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts } from "@/lib/constants";
import { Loading } from "@/components/ui";

interface Profile {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  post_count?: number;
  comment_count?: number;
  follower_count?: number;
  following_count?: number;
  coin_balance?: number;
}

export default function MyProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function confirmDeleteAccount() {
    // Two-step confirmation: deletion is irreversible for the user.
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and removes your personal data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => Alert.alert(
            "Are you sure?",
            "Your account will be deleted and you'll be signed out.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete my account",
                style: "destructive",
                onPress: async () => {
                  const r = await deleteAccount();
                  if (r.ok) {
                    await logout();
                  } else {
                    Alert.alert("Error", "Could not delete your account. Please try again.");
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  }

  if (loading) return <Loading />;

  const displayName = profile?.display_name || user?.display_name || user?.username || "User";
  const username = profile?.username || user?.username || "";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ color: Colors.blue, fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 3 }}>SCOUTA</Text>
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: "600", marginTop: 4 }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Avatar + name */}
        <View style={{ alignItems: "center", marginBottom: 24, marginTop: 8 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.green + "33",
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            <Text style={{ color: Colors.green, fontSize: 26, fontWeight: "700" }}>
              {(displayName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "600" }}>{displayName}</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.mono, marginTop: 4 }}>@{username}</Text>
        </View>

        {profile?.bio ? (
          <Text style={{ color: Colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 20 }}>
            {profile.bio}
          </Text>
        ) : null}

        {/* Stats */}
        <View style={{
          flexDirection: "row", justifyContent: "space-around",
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
          paddingVertical: 16, marginBottom: 24,
        }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: Colors.text, fontSize: 18, fontFamily: Fonts.mono, fontWeight: "700" }}>
              {profile?.post_count ?? 0}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, marginTop: 2 }}>Posts</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: Colors.text, fontSize: 18, fontFamily: Fonts.mono, fontWeight: "700" }}>
              {profile?.comment_count ?? 0}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, marginTop: 2 }}>Comments</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: Colors.text, fontSize: 18, fontFamily: Fonts.mono, fontWeight: "700" }}>
              {profile?.follower_count ?? 0}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, marginTop: 2 }}>Followers</Text>
          </View>
        </View>

        {/* Action links */}
        {[
          { label: "Edit Profile", route: "/(app)/profile/edit", icon: "create-outline" as const },
          { label: "Coin Wallet", route: "/(app)/coins", icon: "wallet-outline" as const },
          { label: "Saved Posts", route: "/(app)/saved", icon: "bookmark-outline" as const },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as any)}
            style={{
              backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
              padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12,
            }}
          >
            <Ionicons name={item.icon} size={18} color={Colors.textSecondary} />
            <Text style={{ color: Colors.text, fontSize: 14, fontFamily: Fonts.mono, flex: 1 }}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={logout}
          style={{
            marginTop: 24, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            borderWidth: 1, borderColor: Colors.red + "44",
          }}
        >
          <Ionicons name="log-out-outline" size={16} color={Colors.red} />
          <Text style={{ color: Colors.red, fontSize: 14, fontFamily: Fonts.mono }}>Log out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={confirmDeleteAccount}
          style={{ marginTop: 16, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: Fonts.mono }}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
