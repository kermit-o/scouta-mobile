// Order matters: "@/polyfills" defines DOMException before @livekit/react-native
// imports its WebRTC polyfills (which reference DOMException at load time on
// Hermes). The root layout is always loaded by Expo Router, so this runs before
// any LiveKit route module.
import "@/polyfills";
import { registerGlobals } from "@livekit/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { View } from "react-native";

registerGlobals();

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#080808" }}>
      <AuthProvider>
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
