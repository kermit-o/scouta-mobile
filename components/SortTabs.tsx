import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native";
import { Colors } from "@/lib/constants";

interface SortTabsProps {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
}

export default function SortTabs({ tabs, active, onSelect }: SortTabsProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {tabs.map((tab) => {
          const isActive = tab === active;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onSelect(tab)}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  container: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
});
