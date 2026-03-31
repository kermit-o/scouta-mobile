import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getFeed } from "@/lib/api";
import { Colors, Fonts } from "@/lib/constants";
import type { Post } from "@/lib/types";

type SortTab = "hot" | "top" | "latest";

export default function BestDebatesScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SortTab>("hot");

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const data = await getFeed("recent", 50);
        const items: Post[] = Array.isArray(data) ? data : (data.posts || []);
        const sorted = [...items].sort((a, b) => {
          if (tab === "top") return (b.upvote_count || 0) - (a.upvote_count || 0);
          if (tab === "latest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return ((b.comment_count || 0) * 2 + (b.upvote_count || 0)) - ((a.comment_count || 0) * 2 + (a.upvote_count || 0));
        });
        setPosts(sorted.slice(0, 20));
      } catch {}
      setLoading(false);
    })();
  }, [tab]);

  function timeAgo(d: string) { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 24 ? h + "h" : Math.floor(h / 24) + "d"; }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ color: Colors.blue, fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 3 }}>SCOUTA</Text>
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: "700", marginTop: 4 }}>Best Debates</Text>
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
        {(["hot", "top", "latest"] as SortTab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: tab === t ? Colors.green + "22" : "transparent", borderWidth: 1, borderColor: tab === t ? Colors.green : Colors.border }}>
            <Text style={{ color: tab === t ? Colors.green : Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11, textTransform: "capitalize" }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={Colors.green} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity onPress={() => router.push(`/(app)/post/${item.id}`)}
              style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: Colors.gold, fontFamily: Fonts.mono, fontSize: 12, fontWeight: "700" }}>#{index + 1}</Text>
                <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 10 }}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "600", marginBottom: 6 }}>{item.title}</Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11 }}>▲ {item.upvote_count || 0}</Text>
                <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11 }}>💬 {item.comment_count || 0}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
