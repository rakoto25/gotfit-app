import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Button, Screen, StateView, TopBar } from '@/components/ui';
import { fetchOnboarding, saveOnboarding } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';
import type { ClientOnboarding } from '@/types';

const goalChoices = ['Me remettre en forme', 'Perdre du poids', 'Gagner en force', 'Réduire mon stress', 'Améliorer ma mobilité', 'Préparer un défi'];
const preferences = ['À la maison', 'En salle', 'En extérieur', 'En visio'];
const availabilities = ['Matin', 'Midi', 'Soir', 'Week-end'];

export default function OnboardingScreen() {
  const { token } = useAuth();
  const resource = useResource(
    () => (token ? fetchOnboarding(token) : Promise.resolve({} as ClientOnboarding)),
    [token]
  );
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState('Débutant');
  const [training, setTraining] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!resource.data) return;
    const frame = requestAnimationFrame(() => {
      setGoals(resource.data?.goals || []);
      setLevel(resource.data?.level || 'Débutant');
      setTraining(resource.data?.training_preferences || []);
      setAvailability(resource.data?.availability || []);
    });
    return () => cancelAnimationFrame(frame);
  }, [resource.data]);

  function toggle(value: string, list: string[], setList: (next: string[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function submit() {
    if (!token) return router.replace('/auth/login');
    if (!goals.length) return Alert.alert('Votre objectif', 'Choisissez au moins un objectif.');
    setSaving(true);
    try {
      await saveOnboarding(token, {
        goals,
        level,
        training_preferences: training,
        availability,
        is_completed: true,
      });
      Alert.alert('Profil personnalisé ✨', 'Vos recommandations vont maintenant mieux vous correspondre.', [
        { text: 'Découvrir', onPress: () => router.replace('/(tabs)/explore') },
      ]);
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <Screen>
        <TopBar back title="Mes objectifs" />
        <AuthGate />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar back title="Mon expérience" subtitle="Quelques réponses, un parcours plus juste" />
      {resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.number}><Text style={styles.numberText}>01</Text></View>
            <View style={styles.flex}>
              <Text style={styles.heroTitle}>Parlons de vous.</Text>
              <Text style={styles.heroText}>Il n’y a pas de petit objectif, seulement un premier pas.</Text>
            </View>
            <Ionicons name="sparkles" size={24} color={colors.lime} />
          </View>

          <Question title="Qu’est-ce qui vous motive ?" subtitle="Plusieurs choix possibles">
            <Choices values={goalChoices} selected={goals} onToggle={(item) => toggle(item, goals, setGoals)} />
          </Question>
          <Question title="Votre niveau actuel">
            <Choices values={['Débutant', 'Intermédiaire', 'Confirmé']} selected={[level]} onToggle={setLevel} />
          </Question>
          <Question title="Où aimez-vous bouger ?">
            <Choices values={preferences} selected={training} onToggle={(item) => toggle(item, training, setTraining)} />
          </Question>
          <Question title="Vos moments préférés">
            <Choices values={availabilities} selected={availability} onToggle={(item) => toggle(item, availability, setAvailability)} />
          </Question>
          <Button loading={saving} variant="lime" icon="checkmark-circle-outline" onPress={submit}>
            Personnaliser mon expérience
          </Button>
        </>
      )}
    </Screen>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionTitle}>{title}</Text>
      {Boolean(subtitle) && <Text style={styles.questionSubtitle}>{subtitle}</Text>}
      <View style={styles.choices}>{children}</View>
    </View>
  );
}

function Choices({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return values.map((value) => {
    const active = selected.includes(value);
    return (
      <Pressable key={value} onPress={() => onToggle(value)} style={[styles.choice, active && styles.choiceActive]}>
        <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={active ? colors.ink : colors.muted} />
        <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{value}</Text>
      </Pressable>
    );
  });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  number: { width: 48, height: 48, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  heroTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.white },
  heroText: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: 'rgba(255,255,255,.66)', marginTop: 3 },
  question: { marginBottom: spacing.xxl },
  questionTitle: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.ink },
  questionSubtitle: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  choice: { minHeight: 45, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 7 },
  choiceActive: { backgroundColor: colors.lime, borderColor: colors.limeStrong },
  choiceText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
  choiceTextActive: { color: colors.ink },
});
