import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { saveToken, saveUser } from "@/lib/auth";
import { Colors } from "@/lib/constants";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; user_id?: string; username?: string; display_name?: string; avatar_url?: string }>();

  useEffect(() => {
    (async () => {
      if (params.token) {
        await saveToken(params.token);
        await saveUser({
          id: Number(params.user_id),
          username: params.username || "",
          display_name: params.display_name || "",
          avatar_url: params.avatar_url || "",
        });
        router.replace("/(app)");
      } else {
        router.replace("/(auth)/login");
      }
    })();
  }, [params.token]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={Colors.green} size="large" />
      <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "monospace", marginTop: 16 }}>Signing in...</Text>
    </View>
  );
}
