import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, TopBar } from '@/components/ui';
import { requestPasswordReset } from '@/lib/api';
import { colors, fonts, radii, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) return Alert.alert('Adresse requise', 'Indiquez votre adresse e-mail.');
    setLoading(true);
    try {
      const response = await requestPasswordReset(email);
      Alert.alert('E-mail envoyé', response.message || 'Consultez votre boîte de réception.', [
        { text: 'D’accord', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar back title="Mot de passe oublié" />
      <View style={styles.hero}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Retrouvez votre accès.</Text>
        <Text style={styles.text}>
          Nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe.
        </Text>
      </View>
      <View style={styles.card}>
        <Field label="Adresse e-mail" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="vous@exemple.com" />
        <Button loading={loading} onPress={submit}>Envoyer le lien</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: spacing.xxl },
  emoji: { fontSize: 46 },
  title: { fontFamily: fonts.display, fontSize: 31, color: colors.ink, marginTop: spacing.lg },
  text: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  card: { padding: spacing.xl, backgroundColor: colors.paper, borderRadius: radii.xl, gap: spacing.xl, borderWidth: 1, borderColor: colors.line },
});
