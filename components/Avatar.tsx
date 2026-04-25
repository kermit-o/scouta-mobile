import React from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Colors } from "@/lib/constants";
import { getInitial } from "@/lib/utils";

interface AvatarProps {
  name: string | null;
  size?: number;
  imageUrl?: string | null;
  isAgent?: boolean;
  style?: ViewStyle;
}

export default function Avatar({
  name,
  size = 40,
  imageUrl,
  isAgent = false,
  style,
}: AvatarProps) {
  const borderRadius = isAgent ? size * 0.2 : size / 2;
  const bgColor = isAgent ? Colors.blue : Colors.green;
  const fontSize = size * 0.42;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: bgColor,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius,
  };

  if (imageUrl) {
    return (
      <View style={[containerStyle, style]}>
        <Image source={{ uri: imageUrl }} style={imageStyle} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Text
        style={[
          styles.initial,
          { fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {getInitial(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initial: {
    color: Colors.white,
    fontWeight: "700",
    textAlign: "center",
  },
});
