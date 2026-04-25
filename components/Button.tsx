import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Colors } from "@/lib/constants";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  size?: Size;
  icon?: React.ReactNode;
}

const SIZES: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 13 },
  md: { paddingVertical: 10, paddingHorizontal: 18, fontSize: 15 },
  lg: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 17 },
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  size = "md",
  icon,
}: ButtonProps) {
  const sizeStyles = SIZES[size];
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: sizeStyles.paddingVertical,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    opacity: isDisabled ? 0.5 : 1,
    ...getVariantContainer(variant),
  };

  const textStyle: TextStyle = {
    fontSize: sizeStyles.fontSize,
    fontWeight: "600",
    ...getVariantText(variant),
  };

  const spinnerColor = variant === "primary" ? Colors.white : getVariantText(variant).color;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} style={styles.spinner} />
      ) : icon ? (
        <>{icon}</>
      ) : null}
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
}

function getVariantContainer(variant: Variant): ViewStyle {
  switch (variant) {
    case "primary":
      return { backgroundColor: Colors.green };
    case "secondary":
      return {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: Colors.border,
      };
    case "ghost":
      return { backgroundColor: "transparent" };
    case "danger":
      return { backgroundColor: Colors.red };
  }
}

function getVariantText(variant: Variant): TextStyle {
  switch (variant) {
    case "primary":
      return { color: Colors.white };
    case "secondary":
      return { color: Colors.text };
    case "ghost":
      return { color: Colors.textSecondary };
    case "danger":
      return { color: Colors.white };
  }
}

const styles = StyleSheet.create({
  spinner: {
    marginRight: 8,
  },
});
