import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import type { ViewStyle, TextStyle, TextInputProps, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors, Fonts } from "@/lib/constants";
import type { ReactNode } from "react";

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex: 1, backgroundColor: Colors.bg }, style]}>{children}</View>;
}

export function Loading({ color = Colors.green }: { color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={color} size="large" />
    </View>
  );
}

export function BackButton({ onPress, color = Colors.text, style }: { onPress?: () => void; color?: string; style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={onPress || (() => router.back())} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={[{ padding: 4, marginLeft: -4, alignSelf: "flex-start" }, style]}>
      <Ionicons name="chevron-back" size={26} color={color} />
    </TouchableOpacity>
  );
}

export function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={{ paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <BackButton onPress={onBack} />
      {title ? (
        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700", flex: 1 }} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ color: Colors.textSecondary, fontSize: 11, fontFamily: Fonts.mono, letterSpacing: 1, marginBottom: 8 }, style]}>{children}</Text>;
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return <View style={[{ backgroundColor: Colors.card, borderWidth: 1, borderColor: accent || Colors.border, padding: 16 }, style]}>{children}</View>;
}

type ButtonVariant = "primary" | "outline" | "danger";
export function Button({ label, onPress, variant = "primary", loading, disabled, icon, style }: {
  label: string; onPress?: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const palette = {
    primary: { bg: Colors.green, border: Colors.green, fg: "#fff" },
    outline: { bg: "transparent", border: Colors.blue, fg: Colors.blue },
    danger: { bg: Colors.red, border: Colors.red, fg: "#fff" },
  }[variant];
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.8}
      style={[{ backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, paddingVertical: 15, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: isDisabled ? 0.45 : 1 }, style]}>
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontSize: 13, fontFamily: Fonts.mono, letterSpacing: 1, fontWeight: "700" }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function IconButton({ name, onPress, color = Colors.text, size = 22, bg, disabled, style }: {
  name: IconName; onPress?: () => void; color?: string; size?: number; bg?: string; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: bg, opacity: disabled ? 0.45 : 1 }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

export function Field({ label, style, ...props }: { label?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, letterSpacing: 1, marginBottom: 6 }}>{label}</Text> : null}
      <TextInput placeholderTextColor={Colors.textMuted}
        style={[{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text, padding: 14, fontSize: 15, fontFamily: Fonts.mono }, style]}
        {...props} />
    </View>
  );
}

export function EmptyState({ icon, text }: { icon?: IconName; text: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 }}>
      {icon ? <Ionicons name={icon} size={44} color={Colors.textMuted} /> : null}
      <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: Fonts.mono, textAlign: "center" }}>{text}</Text>
    </View>
  );
}
