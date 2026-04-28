import "@/lib/polyfills";
import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { registerGlobals } from "@livekit/react-native";

registerGlobals();

function DeepLinkHandler() {
  const { loginWithToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function handle(url: string | null | undefined) {
      if (!url) return;
      if (!url.startsWith("scouta://auth/callback")) return;
      try {
        const parsed = Linking.parse(url);
        const params = (parsed.queryParams || {}) as Record<string, string | string[] | undefined>;
        const token = Array.isArray(params.token) ? params.token[0] : params.token;
        if (!token) {
          console.log("[deep-link] auth/callback without token", url);
          return;
        }
        console.log("[deep-link] auth/callback with token, logging in");
        loginWithToken(token).then((r) => {
          if (r.ok) {
            router.replace("/(app)");
          } else {
            console.log("[deep-link] loginWithToken failed:", r.error);
          }
        });
      } catch (e) {
        console.log("[deep-link] parse error", e);
      }
    }

    // Cold start: app was launched by the deep link
    Linking.getInitialURL().then(handle).catch(() => {});

    // Warm: app was already running and OS opened a deep link
    const sub = Linking.addEventListener("url", (e: { url: string }) => handle(e.url));
    return () => { try { sub.remove(); } catch {} };
  }, [loginWithToken, router]);

  return null;
}

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#080808" }}>
      <AuthProvider>
        <DeepLinkHandler />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#080808" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthProvider>
    </View>
  );
}
