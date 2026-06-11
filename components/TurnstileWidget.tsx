import React, { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

// Public Turnstile site key — same one the web frontend uses on scouta.co.
const SITE_KEY = "0x4AAAAAACmEDpC_1uTRINU3";

// Cloudflare validates the widget against the domains configured for the
// site key, so we render the WebView under the production origin. This is
// the same key/domain the Next.js frontend already uses, so no extra
// Turnstile dashboard config is required.
const BASE_URL = "https://scouta.co";

function buildHtml(): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      html, body { margin: 0; padding: 0; background: #080808; overflow: hidden; }
      #cf { display: flex; justify-content: center; padding: 4px 0; }
    </style>
  </head>
  <body>
    <div id="cf"></div>
    <script>
      function post(msg) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }
      function render() {
        if (!window.turnstile) { setTimeout(render, 300); return; }
        window.turnstile.render("#cf", {
          sitekey: "${SITE_KEY}",
          theme: "dark",
          callback: function (token) { post({ type: "token", token: token }); },
          "expired-callback": function () { post({ type: "expired" }); },
          "error-callback": function () { post({ type: "error" }); },
        });
      }
      render();
    </script>
  </body>
</html>`;
}

interface Props {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export default function TurnstileWidget({ onToken, onExpire, onError }: Props) {
  const html = useMemo(buildHtml, []);
  return (
    <View style={{ height: 76, marginBottom: 16 }}>
      <WebView
        source={{ html, baseUrl: BASE_URL }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={{ backgroundColor: "transparent" }}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "token") onToken(data.token);
            else if (data.type === "expired") onExpire?.();
            else if (data.type === "error") onError?.();
          } catch {
            // ignore malformed messages
          }
        }}
      />
    </View>
  );
}
