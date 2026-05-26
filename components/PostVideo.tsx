import { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

// Inline muted/looping video for the feed, rendered in a WebView (no native
// video module → ships over OTA). "#t=0.1" forces the first frame to render as
// a poster instead of a black box. Playback is driven by `active` (visibility)
// so only the on-screen video plays.
function html(url: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}html,body{height:100%;background:#000;overflow:hidden}video{width:100vw;height:100vh;object-fit:cover}</style>
</head><body><video id="v" muted loop playsinline preload="metadata" src="${url}#t=0.1"></video></body></html>`;
}

const PLAY = "var v=document.getElementById('v');if(v){var p=v.play();if(p&&p.catch){p.catch(function(){});}}true;";
const PAUSE = "var v=document.getElementById('v');if(v){v.pause();}true;";

export function PostVideo({ url, active, height = 200 }: { url: string; active: boolean; height?: number }) {
  const ref = useRef<WebView>(null);

  const apply = () => ref.current?.injectJavaScript(active ? PLAY : PAUSE);
  useEffect(apply, [active]);

  return (
    // pointerEvents none → taps fall through to the post card (open detail).
    <View style={{ width: "100%", height, backgroundColor: "#000" }} pointerEvents="none">
      <WebView
        ref={ref}
        source={{ html: html(url) }}
        style={{ flex: 1, backgroundColor: "#000" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        onLoadEnd={apply}
      />
    </View>
  );
}
