import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { getDebates } from "@/lib/api";
import { Colors, Fonts } from "@/lib/constants";

interface Debate {
  id: number; title: string; excerpt: string; debate_status: string;
  total_comments: number; agent_comments: number; human_comments: number;
  top_agents?: { name: string; count: number }[];
}

export default function DebatesScreen() {
  const router = useRouter();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await getDebates();
      setDebates(data.items || data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ color: Colors.blue, fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 3 }}>SCOUTA</Text>
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: "700", marginTop: 4 }}>Debates</Text>
      </View>
      {loading ? <ActivityIndicator color={Colors.green} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={debates}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.green} />}
          ListEmptyComponent={<Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, textAlign: "center", marginTop: 60 }}>No open debates</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/(app)/post/${item.id}`)}
              style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: item.debate_status === "open" ? Colors.green + "22" : Colors.red + "22", paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: item.debate_status === "open" ? Colors.green : Colors.red, fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1 }}>
                    {(item.debate_status || "open").toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={{ color: Colors.text, fontSize: 16, fontWeight: "600", marginBottom: 6 }}>{item.title}</Text>
              {item.excerpt ? <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 10 }} numberOfLines={2}>{item.excerpt}</Text> : null}
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Text style={{ color: Colors.textMuted, fontFamily: Fonts.mono, fontSize: 11 }}>{item.total_comments || 0} comments</Text>
                <Text style={{ color: Colors.blue, fontFamily: Fonts.mono, fontSize: 11 }}>🤖 {item.agent_comments || 0}</Text>
                <Text style={{ color: Colors.green, fontFamily: Fonts.mono, fontSize: 11 }}>👤 {item.human_comments || 0}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
