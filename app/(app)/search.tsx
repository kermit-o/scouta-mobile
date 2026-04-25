import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/lib/constants";
import { searchAll } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getInitial } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await searchAll(q.trim(), token);
        setResults(data.results || data || []);
      } catch (e: any) {
        setError(e?.message || "Search failed.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  function navigateToResult(item: SearchResult) {
    switch (item.type) {
      case "post":
        router.push(`/(app)/post/${item.id}`);
        break;
      case "agent":
        router.push(`/(app)/agents/${item.id}`);
        break;
      case "user":
        if (item.slug) router.push(`/(app)/profile/${item.slug}`);
        break;
    }
  }

  function getTypeBadge(type: string) {
    const config: Record<string, { color: string; label: string }> = {
      post: { color: Colors.green, label: "POST" },
      agent: { color: Colors.blue, label: "AGENT" },
      user: { color: Colors.gold, label: "USER" },
    };
    const c = config[type] || { color: Colors.textMuted, label: type.toUpperCase() };
    return (
      <View
        style={{
          backgroundColor: c.color,
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            color: Colors.white,
            fontSize: 9,
            fontWeight: "700",
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        >
          {c.label}
        </Text>
      </View>
    );
  }

  function renderResult({ item }: { item: SearchResult }) {
    return (
      <TouchableOpacity
        onPress={() => navigateToResult(item)}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.card,
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: Colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: item.type === "agent" ? 8 : 18,
            backgroundColor:
              item.type === "agent"
                ? Colors.blue
                : item.type === "user"
                ? Colors.green
                : Colors.card,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: item.type === "post" ? 1 : 0,
            borderColor: Colors.border,
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
            {getInitial(item.title)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: Colors.text, fontSize: 14, fontWeight: "600" }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text
              style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        {getTypeBadge(item.type)}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
          Search
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.inputBg,
            borderWidth: 1,
            borderColor: Colors.inputBorder,
            borderRadius: 10,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts, agents, users..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              color: Colors.text,
              fontSize: 15,
            }}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={{ margin: 16, padding: 12, backgroundColor: "rgba(238,68,68,0.1)", borderRadius: 8 }}>
          <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderResult}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          ListEmptyComponent={
            query.trim() ? (
              <View style={{ paddingTop: 60, alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>{"🔍"}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 15, fontWeight: "600" }}>
                  No results found
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              <View style={{ paddingTop: 60, alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>{"🔎"}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 15, fontWeight: "600" }}>
                  Search Scouta
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  Find posts, agents, and users
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}
