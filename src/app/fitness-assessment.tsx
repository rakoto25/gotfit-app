import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Button, Field, Screen, StateView, Tag, TopBar } from '@/components/ui';
import {
  fetchFitnessAssessmentForm,
  fetchMyFitnessAssessment,
  saveFitnessAssessment,
} from '@/lib/api';
import { statusLabel } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';
import type { FitnessQuestion } from '@/types';

export default function FitnessAssessmentScreen() {
  const { token } = useAuth();
  const resource = useResource(
    async () => {
      if (!token) return { form: null, assessment: null };
      const [form, assessment] = await Promise.all([
        fetchFitnessAssessmentForm(token),
        fetchMyFitnessAssessment(token),
      ]);
      return { form, assessment };
    },
    [token]
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const form = resource.data?.form || resource.data?.assessment?.form || null;
  const questions = useMemo(() => form?.questions || [], [form?.questions]);

  useEffect(() => {
    if (resource.data?.assessment?.answers) {
      const frame = requestAnimationFrame(() => {
        setAnswers(resource.data?.assessment?.answers || {});
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [resource.data?.assessment?.answers]);

  function setAnswer(key: string, value: unknown) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function missingRequired() {
    return questions.find((question) => {
      if (!question.required) return false;
      const value = answers[question.key];
      return (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      );
    });
  }

  async function save(status: 'draft' | 'submitted') {
    if (!token) return router.replace('/auth/login');
    if (status === 'submitted') {
      const missing = missingRequired();
      if (missing) {
        return Alert.alert('Reponse requise', `Completez : ${missing.label}`);
      }
    }
    setSaving(true);
    try {
      const response = await saveFitnessAssessment(token, {
        form_id: form?.id || null,
        answers,
        status,
      });
      Alert.alert(
        status === 'submitted' ? 'Bilan transmis' : 'Brouillon enregistre',
        response.message || 'Vos reponses ont ete enregistrees.'
      );
      await resource.reload();
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Veuillez reessayer.');
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <Screen>
        <TopBar back title="Bilan de forme" />
        <AuthGate message="Connectez-vous pour remplir votre bilan et aider votre coach a mieux vous accompagner." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Bilan de forme" subtitle="Votre point de depart" />
      {resource.loading || resource.error || !form ? (
        <StateView
          loading={resource.loading}
          error={resource.error}
          empty="Aucun formulaire de bilan n'est publie pour le moment."
          onRetry={resource.reload}
        />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="clipboard-outline" size={24} color={colors.ink} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroTitle}>{form.title || 'Bilan de forme'}</Text>
              <Text style={styles.heroText}>
                {form.description || 'Ces reponses donnent une base claire a votre accompagnement.'}
              </Text>
            </View>
            <Tag tone="lime">{statusLabel(resource.data?.assessment?.status)}</Tag>
          </View>

          {questions.map((question) => (
            <Question
              key={question.key}
              question={question}
              value={answers[question.key]}
              onChange={(value) => setAnswer(question.key, value)}
            />
          ))}

          <View style={styles.actions}>
            <Button
              full={false}
              variant="light"
              loading={saving}
              icon="save-outline"
              onPress={() => save('draft')}
            >
              Sauvegarder
            </Button>
            <Button
              full={false}
              variant="lime"
              loading={saving}
              icon="checkmark-circle-outline"
              onPress={() => save('submitted')}
            >
              Transmettre
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

function Question({
  question,
  value,
  onChange,
}: {
  question: FitnessQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (question.type === 'single_choice') {
    return (
      <QuestionShell question={question}>
        <ChoiceList
          values={question.options || []}
          selected={typeof value === 'string' ? [value] : []}
          onToggle={onChange}
        />
      </QuestionShell>
    );
  }

  if (question.type === 'multiple_choice') {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <QuestionShell question={question}>
        <ChoiceList
          values={question.options || []}
          selected={selected}
          onToggle={(item) =>
            onChange(
              selected.includes(item)
                ? selected.filter((entry) => entry !== item)
                : [...selected, item]
            )
          }
        />
      </QuestionShell>
    );
  }

  if (question.type === 'boolean') {
    return (
      <QuestionShell question={question}>
        <ChoiceList
          values={['Oui', 'Non']}
          selected={value === true ? ['Oui'] : value === false ? ['Non'] : []}
          onToggle={(item) => onChange(item === 'Oui')}
        />
      </QuestionShell>
    );
  }

  return (
    <QuestionShell question={question}>
      <Field
        label={question.label}
        value={value == null ? '' : String(value)}
        onChangeText={(text) => onChange(question.type === 'number' ? Number(text) || text : text)}
        placeholder={question.type === 'date' ? 'AAAA-MM-JJ' : 'Votre reponse'}
        keyboardType={question.type === 'number' ? 'decimal-pad' : 'default'}
        multiline={question.type === 'textarea'}
      />
    </QuestionShell>
  );
}

function QuestionShell({
  question,
  children,
}: {
  question: FitnessQuestion;
  children: ReactNode;
}) {
  return (
    <View style={styles.question}>
      <View style={styles.questionTop}>
        <Text style={styles.questionTitle}>{question.label}</Text>
        {question.required ? <Tag tone="coral">Requis</Tag> : null}
      </View>
      {children}
    </View>
  );
}

function ChoiceList({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View style={styles.choices}>
      {values.map((value) => {
        const active = selected.includes(value);
        return (
          <Pressable
            key={value}
            style={[styles.choice, active && styles.choiceActive]}
            onPress={() => onToggle(value)}
          >
            <Ionicons
              name={active ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={active ? colors.ink : colors.muted}
            />
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{value}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.lg, marginVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.white },
  heroText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: 'rgba(255,255,255,.68)', marginTop: 3 },
  question: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginBottom: spacing.md },
  questionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  questionTitle: { flex: 1, fontFamily: fonts.extraBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 43, borderRadius: radii.pill, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  choiceActive: { backgroundColor: colors.lime, borderColor: colors.limeStrong },
  choiceText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
  choiceTextActive: { color: colors.ink },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
