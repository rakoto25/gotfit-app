import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { GoogleAuthButton } from "@/components/google-auth-button";
import { Button, Field, IconButton, Screen } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import { colors, fonts, radii, spacing } from "@/theme";

const LOGO_URL = "https://api.gotfit.tech/images/logo.png";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const done = useCallback(() => {
    const destination = redirect && redirect.startsWith('/') ? redirect : '/(tabs)';
    router.replace(destination as never);
  }, [redirect]);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Champs manquants",
        "Renseignez votre e-mail et votre mot de passe.",
      );
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      done();
    } catch (error) {
      Alert.alert(
        "Connexion impossible",
        error instanceof Error ? error.message : "Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.top}>
        <IconButton icon="close" label="Fermer" onPress={() => router.back()} />

        <Image
          source={LOGO_URL}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel="Logo Gotfit"
        />

        <View style={styles.placeholder} />
      </View>

      <View style={styles.intro}>
        <Text style={styles.kicker}>Ravi de vous revoir</Text>

        <Text style={styles.title}>
          Reprenez là où{"\n"}
          vous brilliez.
        </Text>

        <Text style={styles.subtitle}>
          Votre coach, vos séances et tous vos progrès vous attendent.
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="Adresse e-mail"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="vous@exemple.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Field
          label="Mot de passe"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Votre mot de passe"
          secureTextEntry
          autoComplete="current-password"
        />

        <Pressable onPress={() => router.push("/auth/forgot-password")}>
          <Text style={styles.forgot}>Mot de passe oublié ?</Text>
        </Pressable>

        <Button loading={loading} icon="arrow-forward" onPress={submit}>
          Se connecter
        </Button>

        <View style={styles.or}>
          <View style={styles.line} />
          <Text style={styles.orText}>ou</Text>
          <View style={styles.line} />
        </View>

        <GoogleAuthButton role="client" onSuccess={done} />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.bottomText}>Pas encore membre ?</Text>

        <Pressable onPress={() => router.replace({ pathname: '/auth/register', params: redirect ? { redirect } : {} })}>
          <Text style={styles.bottomLink}>Créer mon compte</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    width: 130,
    height: 50,
  },

  placeholder: {
    width: 43,
  },

  intro: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },

  kicker: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.success,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },

  title: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 45,
    color: colors.ink,
    marginTop: spacing.md,
  },

  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    marginTop: spacing.md,
    maxWidth: 310,
  },

  form: {
    backgroundColor: colors.paper,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },

  forgot: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.ink,
    textAlign: "right",
  },

  or: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },

  orText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
  },

  bottom: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: spacing.xl,
  },

  bottomText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },

  bottomLink: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
