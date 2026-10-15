import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { GoogleAuthButton } from "@/components/google-auth-button";
import { Button, Field, IconButton, Screen } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import { colors, fonts, radii, spacing } from "@/theme";

const GOTFIT_LOGO_URL = "https://api.gotfit.tech/images/logo.png";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const [role, setRole] = useState<"client" | "intervenant">("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const done = useCallback(() => {
    const destination = redirect && redirect.startsWith('/')
      ? redirect
      : role === "intervenant" ? "/coach/documents" : "/onboarding";
    router.replace(destination as never);
  }, [redirect, role]);

  async function submit() {
    if (!name.trim() || !email.trim() || !password || !confirmation) {
      Alert.alert("Champs manquants", "Complétez les champs obligatoires.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Mot de passe trop court", "Utilisez au moins 8 caractères.");
      return;
    }

    if (password !== confirmation) {
      Alert.alert(
        "Confirmation différente",
        "Les deux mots de passe doivent être identiques.",
      );
      return;
    }

    if (role === "intervenant" && siret.replace(/\D/g, "").length !== 14) {
      Alert.alert("SIRET invalide", "Le SIRET du coach doit contenir exactement 14 chiffres.");
      return;
    }

    setLoading(true);

    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        password_confirmation: confirmation,
        role,
        siret: role === "intervenant" ? siret.replace(/\D/g, "") : undefined,
      });

      done();
    } catch (error) {
      Alert.alert(
        "Inscription impossible",
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
          source={GOTFIT_LOGO_URL}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel="Logo Gotfit"
        />

        <View style={styles.placeholder} />
      </View>

      <View style={styles.intro}>
        <Text style={styles.kicker}>Bienvenue chez Gotfit</Text>

        <Text style={styles.title}>Créez l’élan qui{"\n"}change tout.</Text>

        <Text style={styles.subtitle}>
          Inscrivez-vous avec le formulaire ou en un geste avec Google.
        </Text>
      </View>

      <View style={styles.roleWrap}>
        <Text style={styles.roleLabel}>Je souhaite</Text>

        <View style={styles.roles}>
          <RoleChoice
            active={role === "client"}
            icon="fitness-outline"
            label="Être accompagné"
            onPress={() => setRole("client")}
          />

          <RoleChoice
            active={role === "intervenant"}
            icon="ribbon-outline"
            label="Devenir coach"
            onPress={() => setRole("intervenant")}
          />
        </View>
      </View>

      <View style={styles.google}>
        <GoogleAuthButton
          role={role}
          label="S’inscrire avec Google"
          onSuccess={done}
        />

        <Text style={styles.googleHint}>
          Google renseigne automatiquement votre nom et votre adresse e-mail.
        </Text>
      </View>

      <View style={styles.or}>
        <View style={styles.line} />

        <Text style={styles.orText}>ou remplir le formulaire</Text>

        <View style={styles.line} />
      </View>

      <View style={styles.form}>
        <Field
          label="Nom complet *"
          icon="person-outline"
          value={name}
          onChangeText={setName}
          placeholder="Votre nom"
          autoComplete="name"
        />

        <Field
          label="Adresse e-mail *"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="vous@exemple.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Field
          label="Téléphone"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="+33…"
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        {role === "intervenant" && (
          <Field
            label="SIRET *"
            icon="business-outline"
            value={siret}
            onChangeText={setSiret}
            placeholder="123 456 789 00012"
            keyboardType="number-pad"
          />
        )}

        <Field
          label="Mot de passe *"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="8 caractères minimum"
          secureTextEntry
          autoComplete="new-password"
        />

        <Field
          label="Confirmer *"
          icon="shield-checkmark-outline"
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Confirmez le mot de passe"
          secureTextEntry
          autoComplete="new-password"
        />

        <Button loading={loading} icon="sparkles-outline" onPress={submit}>
          Créer mon compte
        </Button>

        <Text style={styles.legal}>
          En continuant, vous acceptez les conditions d’utilisation et la
          politique de confidentialité de Gotfit.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.bottomText}>Déjà membre ?</Text>

        <Pressable onPress={() => router.replace({ pathname: '/auth/login', params: redirect ? { redirect } : {} })}>
          <Text style={styles.bottomLink}>Se connecter</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function RoleChoice({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: "fitness-outline" | "ribbon-outline";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.role, active && styles.roleActive]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={active ? colors.lime : colors.ink}
      />

      <Text style={[styles.roleText, active && styles.roleTextActive]}>
        {label}
      </Text>
    </Pressable>
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
    width: 112,
    height: 50,
  },

  placeholder: {
    width: 43,
  },

  intro: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
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
    fontSize: 39,
    lineHeight: 42,
    color: colors.ink,
    marginTop: spacing.md,
  },

  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    marginTop: spacing.md,
  },

  roleWrap: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  roleLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },

  roles: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  role: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  roleActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },

  roleText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.ink,
  },

  roleTextActive: {
    color: colors.white,
  },

  google: {
    gap: spacing.sm,
  },

  googleHint: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.muted,
    textAlign: "center",
  },

  or: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xl,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },

  orText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
  },

  form: {
    backgroundColor: colors.paper,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },

  legal: {
    fontFamily: fonts.regular,
    fontSize: 8,
    lineHeight: 13,
    color: colors.muted,
    textAlign: "center",
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
