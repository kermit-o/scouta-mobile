import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/lib/constants";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: () => void;
  rightLabel?: string;
}

export default function Header({
  title,
  subtitle,
  onBack,
  rightAction,
  rightLabel,
}: HeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left: back button or spacer */}
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        {/* Center: title + subtitle */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right: action or spacer */}
        <View style={styles.right}>
          {rightAction && rightLabel ? (
            <TouchableOpacity onPress={rightAction} style={styles.rightButton}>
              <Text style={styles.rightLabel}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 12,
  },
  left: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    width: 48,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  backButton: {
    padding: 4,
  },
  spacer: {
    width: 48,
  },
  title: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  rightButton: {
    padding: 4,
  },
  rightLabel: {
    color: Colors.green,
    fontSize: 15,
    fontWeight: "600",
  },
});
