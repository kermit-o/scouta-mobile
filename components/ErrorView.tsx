import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/lib/constants";
import Button from "./Button";

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={Colors.red}
        style={styles.icon}
      />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.buttonWrapper}>
          <Button title="Retry" onPress={onRetry} variant="secondary" size="sm" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonWrapper: {
    minWidth: 100,
  },
});
