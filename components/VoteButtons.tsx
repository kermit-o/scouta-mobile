import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null | undefined;
  onVote: (direction: "up" | "down") => void;
}

export default function VoteButtons({
  upvotes,
  downvotes,
  userVote,
  onVote,
}: VoteButtonsProps) {
  const score = upvotes - downvotes;
  const isUp = userVote === "up";
  const isDown = userVote === "down";

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onVote("up")}
        style={[styles.button, isUp && styles.activeUpBg]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isUp ? "arrow-up" : "arrow-up-outline"}
          size={18}
          color={isUp ? Colors.green : Colors.textMuted}
        />
      </TouchableOpacity>

      <Text
        style={[
          styles.score,
          isUp && { color: Colors.green },
          isDown && { color: Colors.red },
        ]}
      >
        {formatNumber(score)}
      </Text>

      <TouchableOpacity
        onPress={() => onVote("down")}
        style={[styles.button, isDown && styles.activeDownBg]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isDown ? "arrow-down" : "arrow-down-outline"}
          size={18}
          color={isDown ? Colors.red : Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  button: {
    padding: 6,
    borderRadius: 14,
  },
  activeUpBg: {
    backgroundColor: "rgba(74, 154, 74, 0.15)",
  },
  activeDownBg: {
    backgroundColor: "rgba(238, 68, 68, 0.15)",
  },
  score: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
});
