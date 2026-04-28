import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, API_BASE } from "@/lib/constants";

const CALLBACK_SCHEME = "scouta://auth/callback";

function parseQuery(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = url.split("?")[1] || "";
  for (const pair of q.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(pair.slice(0, idx));
    const v = decodeURIComponent(pair.slice(idx + 1));
    out[k] = v;
  }
  return out;
}

export default function GoogleLoginScreen() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const handledRef = useRef(false);

  function handleCallback(url: string) {
    if (handledRef.current) return;
    handledRef.current = true;
    const params = parseQuery(url);
    const token = params.token;
    if (!token) {
      setError("Sign-in failed: no token returned");
      return;
    }
    loginWithToken(token).then(function(r){
      if (r.ok) {
        router.replace("/(app)");
      } else {
        setError(r.error || "Sign-in failed");
      }
    });
  }

  function onShouldStartLoadWithRequest(req: WebViewNavigation): boolean {
    if (req.url.startsWith(CALLBACK_SCHEME)) {
      handleCallback(req.url);
      return false;
    }
    return true;
  }

  function onNavigationStateChange(state: WebViewNavigation) {
    if (state.url.startsWith(CALLBACK_SCHEME)) {
      handleCallback(state.url);
    }
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: Colors.red, fontFamily: Fonts.mono, fontSize: 12, textAlign: "center", marginBottom: 24 }}>{error}</Text>
        <TouchableOpacity onPress={function(){ router.replace("/(auth)/login"); }}
          style={{ borderWidth: 1, borderColor: Colors.blue, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: Colors.blue, fontFamily: Fonts.mono }}>Back to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 48, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <TouchableOpacity onPress={function(){ router.back(); }} style={{ padding: 4 }}>
          <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 12 }}>{"< Cancel"}</Text>
        </TouchableOpacity>
        <Text style={{ color: Colors.text, fontFamily: Fonts.mono, fontSize: 12, marginLeft: 12 }}>Sign in with Google</Text>
      </View>
      <WebView
        source={{ uri: `${API_BASE}/auth/google?redirect_mobile=1` }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={onNavigationStateChange}
        onLoadEnd={function(){ setLoading(false); }}
        onError={function(e: any){ setError("WebView error: " + (e?.nativeEvent?.description || "unknown")); }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />
      {loading && (
        <View pointerEvents="none" style={{ position: "absolute", top: 80, left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator color={Colors.green} />
        </View>
      )}
    </View>
  );
}
