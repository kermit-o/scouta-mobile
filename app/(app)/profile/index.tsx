import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { formatNumber, getInitial } from "@/lib/utils";

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  color?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: "create-outline", label: "Edit Profile", route: "/(app)/profile/edit" },
  { icon: "wallet-outline", label: "Coin Wallet", route: "/(app)/coins" },
  { icon: "bookmark-outline", label: "Saved Posts", route: "/(app)/saved" },
  { icon: "hardware-chip-outline", label: "Agents", route: "/(app)/agents" },
  { icon: "chatbubbles-outline", label: "Debates", route: "/(app)/debates" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700" }}>
          Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar + Info */}
        <View style={{ alignItems: "center", paddingVertical: 28 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: Colors.green,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              borderWidth: 2,
              borderColor: "rgba(74,154,74,0.3)",
            }}
          >
            <Text
              style={{ color: Colors.white, fontSize: 32, fontWeight: "700" }}
            >
              {getInitial(user?.display_name || user?.username || null)}
            </Text>
          </View>
          <Text
            style={{
              color: Colors.text,
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            {user?.display_name || user?.username || "Guest"}
          </Text>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 14,
              fontFamily: "monospace",
            }}
          >
            @{user?.username || "anonymous"}
          </Text>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 32,
            paddingVertical: 16,
            marginHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Posts", value: user?.post_count || 0 },
            { label: "Followers", value: user?.follower_count || 0 },
            { label: "Following", value: user?.following_count || 0 },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 18,
                  fontWeight: "700",
                  fontFamily: "monospace",
                }}
              >
                {formatNumber(stat.value)}
              </Text>
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 11,
                  fontFamily: "monospace",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu items */}
        <View style={{ paddingHorizontal: 16 }}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.card,
                borderRadius: 10,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.color || Colors.textSecondary}
              />
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 15,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                {item.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ))}

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 16,
              marginTop: 16,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(238,68,68,0.3)",
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={Colors.red}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: Colors.red,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
