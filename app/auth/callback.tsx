import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setSession } = useAuth();

  useEffect(() => {
    async function handleCallback() {
      try {
        const token = params.token as string | undefined;
        const userParam = params.user as string | undefined;

        if (token && userParam) {
          const user = JSON.parse(decodeURIComponent(userParam));
          await setSession(token, user);
          router.replace("/(app)");
        } else if (token) {
          await setSession(token, null);
          router.replace("/(app)");
        } else {
          router.replace("/(auth)/login");
        }
      } catch (e) {
        console.error("Auth callback error:", e);
        router.replace("/(auth)/login");
      }
    }

    handleCallback();
  }, [params]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color={Colors.green} />
      <Text
        style={{
          color: Colors.textMuted,
          marginTop: 16,
          fontSize: 14,
        }}
      >
        Signing you in...
      </Text>
    </View>
  );
}
