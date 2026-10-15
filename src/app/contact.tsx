import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, TopBar } from '@/components/ui';
import { submitContact } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function ContactScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      return Alert.alert('Informations manquantes', 'Complétez tous les champs obligatoires.');
    }
    setLoading(true);
    try {
      await submitContact({ name, email, subject, message });
      setSubject('');
      setMessage('');
      Alert.alert('Message envoyé ✨', 'L’équipe Gotfit vous répondra dans les meilleurs délais.');
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar back title="Contact" subtitle="Une question ? Nous sommes là." />
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>👋</Text>
        <Text style={styles.heroTitle}>Parlons-nous.</Text>
        <Text style={styles.heroText}>Un humain vous répond, avec attention et sans réponse automatique compliquée.</Text>
      </View>
      <View style={styles.form}>
        <Field label="Nom complet *" icon="person-outline" value={name} onChangeText={setName} placeholder="Votre nom" />
        <Field label="E-mail *" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="vous@exemple.com" autoCapitalize="none" keyboardType="email-address" />
        <Field label="Sujet *" icon="bookmark-outline" value={subject} onChangeText={setSubject} placeholder="Comment pouvons-nous vous aider ?" />
        <Field label="Votre message *" icon="chatbubble-outline" value={message} onChangeText={setMessage} placeholder="Dites-nous tout…" multiline />
        <Button loading={loading} variant="lime" icon="send-outline" onPress={submit}>Envoyer mon message</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  heroEmoji: { fontSize: 43 },
  heroTitle: { fontFamily: fonts.display, fontSize: 34, color: colors.ink, marginTop: spacing.md },
  heroText: { maxWidth: 310, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  form: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.line },
});
