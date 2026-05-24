import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { WebView } from "react-native-webview";
import { getRecordings } from "@/lib/api";
import { Colors, Fonts } from "@/lib/constants";
import { BackButton } from "@/components/ui";

interface Recording {
  id: number;
  title: string | null;
  playback_url: string | null;
  duration_seconds: number | null;
  host_username: string | null;
}

function fmtDur(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function playerHTML(url: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}body{background:#000}video{width:100vw;height:100vh;object-fit:contain}</style></head><body><video controls autoplay playsinline src="${url}"></video></body></html>`;
}

export default function ReplaysScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    getRecordings()
      .then((d) => setRecordings(d.recordings || []))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 52, paddingHorizontal: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BackButton />
        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700" }}>Replays</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.red} style={{ marginTop: 40 }} />
      ) : recordings.length === 0 ? (
        <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 13, textAlign: "center", marginTop: 40 }}>No replays yet.</Text>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              disabled={!item.playback_url}
              onPress={() => item.playback_url && setPlaying(item.playback_url)}
              style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ fontSize: 28 }}>▶️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }} numberOfLines={1}>{item.title || "Untitled live"}</Text>
                <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11, marginTop: 2 }}>
                  @{item.host_username}  ·  {fmtDur(item.duration_seconds)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!playing} animationType="slide" onRequestClose={() => setPlaying(null)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity onPress={() => setPlaying(null)} style={{ position: "absolute", top: 48, right: 20, zIndex: 10 }}>
            <Text style={{ color: "#fff", fontSize: 24 }}>X</Text>
          </TouchableOpacity>
          {playing && (
            <WebView source={{ html: playerHTML(playing) }} style={{ flex: 1, backgroundColor: "#000" }} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} />
          )}
        </View>
      </Modal>
    </View>
  );
}
