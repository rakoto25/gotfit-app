import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, shadow, spacing } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const GOTFIT_LOGO_URL = "https://api.gotfit.tech/images/logo.png";

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  style,
}: PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}>) {
  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );

  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

export function Brand({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) {
  return (
    <Image
      source={GOTFIT_LOGO_URL}
      style={[
        styles.brandLogo,
        compact && styles.brandLogoCompact,
        inverse && styles.brandLogoInverse,
      ]}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={200}
      accessibilityLabel="Logo Gotfit"
    />
  );
}

export function TopBar({
  title,
  subtitle,
  back,
  action,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLead}>
        {back ? (
          <IconButton
            icon="arrow-back"
            label="Retour"
            onPress={() => router.back()}
          />
        ) : (
          <Brand compact />
        )}

        {Boolean(title || subtitle) && (
          <View style={styles.topBarText}>
            {Boolean(title) && <Text style={styles.topBarTitle}>{title}</Text>}

            {Boolean(subtitle) && <Text style={styles.topBarSubtitle}>{subtitle}</Text>}
          </View>
        )}
      </View>

      {action}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  tone = "light",
  ...props
}: Omit<PressableProps, "children"> & {
  icon: IconName;
  label: string;
  tone?: "light" | "dark" | "lime";
}) {
  const toneStyle =
    tone === "dark"
      ? styles.iconDark
      : tone === "lime"
        ? styles.iconLime
        : styles.iconLight;

  const color =
    tone === "dark"
      ? colors.white
      : tone === "lime"
        ? colors.brandStrong
        : colors.ink;

  return (
    <Pressable
      accessibilityLabel={label}
      {...props}
      style={({ pressed }) => [
        styles.iconButton,
        toneStyle,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

export function Button({
  children,
  icon,
  variant = "dark",
  loading,
  full = true,
  ...props
}: PropsWithChildren<
  PressableProps & {
    icon?: IconName;
    variant?: "dark" | "lime" | "light" | "ghost" | "danger";
    loading?: boolean;
    full?: boolean;
  }
>) {
  const background =
    variant === "dark"
      ? colors.ink
      : variant === "lime"
        ? colors.brand
        : variant === "danger"
          ? colors.danger
          : variant === "light"
            ? colors.paper
            : "transparent";

  const textColor =
    variant === "lime"
      ? colors.ink
      : variant === "dark" ||
          variant === "danger" ||
          variant === "ghost"
        ? colors.white
        : colors.ink;

  return (
    <Pressable
      {...props}
      disabled={props.disabled || loading}
      onPress={(event) => {
        Haptics.selectionAsync().catch(() => undefined);

        props.onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        full && styles.full,
        variant === "light" && styles.lightBorder,
        variant === "ghost" && styles.ghostButton,
        (pressed || props.disabled || loading) && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}

          <Text style={[styles.buttonText, { color: textColor }]}>
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  icon,
  multiline,
  ...props
}: TextInputProps & {
  label: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={[styles.field, multiline && styles.fieldMultiline]}>
        {icon ? <Ionicons name={icon} size={19} color={colors.muted} /> : null}

        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor="#98A29C"
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            props.style,
          ]}
        />
      </View>
    </View>
  );
}

export function Eyebrow({
  children,
  inverse = false,
}: PropsWithChildren<{
  inverse?: boolean;
}>) {
  return (
    <View style={[styles.eyebrow, inverse && styles.eyebrowInverse]}>
      <View
        style={[
          styles.eyebrowDot,
          inverse && {
            backgroundColor: colors.lime,
          },
        ]}
      />

      <Text
        style={[
          styles.eyebrowText,
          inverse && {
            color: colors.white,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {Boolean(subtitle) && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>

      {action && (
        <Pressable onPress={action.onPress} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action.label}</Text>

          <Ionicons name="arrow-forward" size={15} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

export function Avatar({
  uri,
  name,
  size = 48,
  ring = false,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const initials = String(name || "G")
    .split(" ")
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        ring && styles.avatarRing,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: size / 2,
          }}
          contentFit="cover"
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: PropsWithChildren<{
  tone?: "neutral" | "lime" | "coral" | "dark";
}>) {
  const backgroundColor =
    tone === "lime"
      ? colors.brandSoft
      : tone === "coral"
        ? colors.coral
        : tone === "dark"
          ? colors.ink
          : colors.canvas;

  const color =
    tone === "dark"
      ? colors.white
      : tone === "lime"
        ? colors.brandStrong
        : tone === "coral"
          ? colors.brandStrong
          : colors.ink;

  return (
    <View style={[styles.tag, { backgroundColor }]}>
      <Text style={[styles.tagText, { color }]}>{children}</Text>
    </View>
  );
}

export function StateView({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="large" color={colors.ink} />

        <Text style={styles.stateText}>On prépare votre expérience…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.state}>
        <View style={styles.stateIcon}>
          <Ionicons name="cloud-offline-outline" size={25} color={colors.ink} />
        </View>

        <Text style={styles.stateTitle}>Connexion interrompue</Text>

        <Text style={styles.stateText}>{error}</Text>

        {onRetry && (
          <Button full={false} variant="lime" onPress={onRetry}>
            Réessayer
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name="sparkles-outline" size={25} color={colors.ink} />
      </View>

      <Text style={styles.stateTitle}>Bientôt ici</Text>

      <Text style={styles.stateText}>
        {empty || "Aucun élément pour le moment."}
      </Text>
    </View>
  );
}

export function AuthGate({ message }: { message?: string }) {
  return (
    <LinearGradient
      colors={[colors.ink, colors.brandStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.authGate}
    >
      <View style={styles.authGateIcon}>
        <Ionicons name="lock-open-outline" size={25} color={colors.ink} />
      </View>

      <Text style={styles.authGateTitle}>Votre espace vous attend.</Text>

      <Text style={styles.authGateText}>
        {message ||
          "Connectez-vous pour retrouver vos séances et votre progression."}
      </Text>

      <Button variant="lime" onPress={() => router.push("/auth/login")}>
        Se connecter
      </Button>

      <Button variant="ghost" onPress={() => router.push("/auth/register")}>
        Créer mon compte
      </Button>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  flex: {
    flex: 1,
  },

  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },

  brandLogo: {
    width: 112,
    height: 50,
  },

  brandLogoCompact: {
    width: 90,
    height: 38,
  },

  brandLogoInverse: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
  },

  topBar: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  topBarLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  topBarText: {
    flex: 1,
  },

  topBarTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },

  topBarSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },

  iconButton: {
    width: 43,
    height: 43,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  iconLight: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },

  iconDark: {
    backgroundColor: colors.ink,
  },

  iconLime: {
    backgroundColor: colors.brandSoft,
  },

  button: {
    minHeight: 54,
    borderRadius: radii.md,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  full: {
    width: "100%",
  },

  lightBorder: {
    borderWidth: 1,
    borderColor: colors.line,
  },

  ghostButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },

  buttonText: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
  },

  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },

  fieldWrap: {
    gap: spacing.sm,
  },

  fieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },

  field: {
    minHeight: 55,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },

  fieldMultiline: {
    minHeight: 120,
    alignItems: "flex-start",
    paddingTop: spacing.lg,
  },

  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },

  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  eyebrowInverse: {
    alignSelf: "flex-start",
  },

  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },

  eyebrowText: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },

  sectionHeader: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },

  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.ink,
  },

  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
  },

  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
  },

  sectionActionText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },

  avatar: {
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatarRing: {
    borderWidth: 3,
    borderColor: colors.white,
  },

  avatarText: {
    fontFamily: fonts.extraBold,
    color: colors.ink,
  },

  tag: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  tagText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },

  state: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },

  stateIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  stateTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 19,
    color: colors.ink,
  },

  stateText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: colors.muted,
  },

  authGate: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: "center",
    gap: spacing.md,
    ...shadow,
  },

  authGateIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  authGateTitle: {
    fontFamily: fonts.display,
    fontSize: 27,
    color: colors.white,
    textAlign: "center",
  },

  authGateText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 21,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
});
