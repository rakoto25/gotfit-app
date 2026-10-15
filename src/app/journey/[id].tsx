import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Field, Screen, StateView, Tag, TopBar } from '@/components/ui';
import {
  createClientNote,
  deleteClientNote,
  fetchClientFitnessAssessments,
  fetchClientHistory,
  fetchClientNotes,
  getAssetUrl,
  reviewFitnessAssessment,
} from '@/lib/api';
import { annonceTitle, formatDate, reservationDate, statusLabel } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';
import type { ClientNote, FitnessAssessment } from '@/types';

export default function ClientJourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [shared, setShared] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [working, setWorking] = useState(false);
  const resource = useResource(
    async () => {
      if (!token) throw new Error('Connexion requise.');
      const [history, notes, assessments] = await Promise.all([
        fetchClientHistory(token, id),
        fetchClientNotes(token, id),
        fetchClientFitnessAssessments(token, id),
      ]);
      return { history, notes, assessments };
    },
    [token, id]
  );
  const client = resource.data?.history.client;
  const assessments = resource.data?.assessments || [];
  const latestAssessment = assessments[0];

  async function addNote() {
    if (!token || !noteContent.trim()) {
      return Alert.alert('Note requise', 'Ajoutez un contenu avant de sauvegarder.');
    }
    setWorking(true);
    try {
      await createClientNote(token, id, {
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
        visibility: shared ? 'shared' : 'private',
      });
      setNoteTitle('');
      setNoteContent('');
      setShared(false);
      await resource.reload();
      Alert.alert('Note enregistree', 'La note est ajoutee au parcours client.');
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Veuillez reessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function removeNote(note: ClientNote) {
    if (!token) return;
    Alert.alert('Supprimer la note ?', 'Cette action retire la note du parcours.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            await deleteClientNote(token, note.id);
            await resource.reload();
          } catch (error) {
            Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Veuillez reessayer.');
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }

  async function reviewAssessment(assessment?: FitnessAssessment) {
    if (!token || !assessment?.id || !coachNotes.trim()) {
      return Alert.alert('Analyse requise', 'Ajoutez votre retour coach avant de valider.');
    }
    setWorking(true);
    try {
      await reviewFitnessAssessment(token, assessment.id, coachNotes);
      setCoachNotes('');
      await resource.reload();
      Alert.alert('Bilan analyse', 'Votre retour est enregistre.');
    } catch (error) {
      Alert.alert('Validation impossible', error instanceof Error ? error.message : 'Veuillez reessayer.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Parcours client" subtitle={`Client #${id}`} />
      {resource.loading || resource.error || !resource.data ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.header}>
            <Avatar name={client?.name} uri={getAssetUrl(client?.photo_url || client?.photo)} size={64} />
            <View style={styles.flex}>
              <Text style={styles.name}>{client?.name || 'Client Gotfit'}</Text>
              <Text style={styles.email}>{client?.email}</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <Metric value={String(resource.data.history.summary?.reservations_count || 0)} label="Reservations" />
            <Metric value={String(resource.data.history.summary?.completed_reservations_count || 0)} label="Realisees" />
            <Metric value={String(resource.data.history.summary?.notes_count || 0)} label="Notes" />
          </View>

          <Text style={styles.heading}>Bilan de forme</Text>
          {latestAssessment ? (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{latestAssessment.form?.title || 'Bilan client'}</Text>
                  <Text style={styles.meta}>{formatDate(latestAssessment.submitted_at || latestAssessment.created_at, true)}</Text>
                </View>
                <Tag tone="lime">{statusLabel(latestAssessment.status)}</Tag>
              </View>
              <Answers assessment={latestAssessment} />
              {latestAssessment.coach_notes ? (
                <Text style={styles.noteText}>{latestAssessment.coach_notes}</Text>
              ) : (
                <>
                  <Field
                    label="Retour coach"
                    value={coachNotes}
                    onChangeText={setCoachNotes}
                    placeholder="Analyse, priorites, prochaines etapes..."
                    multiline
                  />
                  <Button loading={working} variant="lime" icon="checkmark-circle-outline" onPress={() => reviewAssessment(latestAssessment)}>
                    Valider analyse
                  </Button>
                </>
              )}
            </View>
          ) : (
            <StateView empty="Aucun bilan de forme transmis par ce client." />
          )}

          <Text style={styles.heading}>Notes de suivi</Text>
          <View style={styles.card}>
            <Field label="Titre" value={noteTitle} onChangeText={setNoteTitle} placeholder="Ex. Point mobilite" />
            <Field label="Note" value={noteContent} onChangeText={setNoteContent} placeholder="Observation, conseil, prochaine etape..." multiline />
            <Pressable style={styles.toggle} onPress={() => setShared((value) => !value)}>
              <Ionicons name={shared ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={shared ? colors.brandStrong : colors.muted} />
              <Text style={styles.toggleText}>Partager avec le client</Text>
            </Pressable>
            <Button loading={working} icon="save-outline" onPress={addNote}>
              Ajouter la note
            </Button>
          </View>

          {resource.data.notes.length ? (
            resource.data.notes.map((note) => (
              <View key={note.id} style={styles.note}>
                <View style={styles.cardTop}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{note.title || 'Note de suivi'}</Text>
                    <Text style={styles.meta}>{formatDate(note.created_at, true)} · {note.visibility === 'shared' ? 'Partagee' : 'Privee'}</Text>
                  </View>
                  <Pressable onPress={() => removeNote(note)}>
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
                </View>
                <Text style={styles.noteText}>{note.content}</Text>
              </View>
            ))
          ) : (
            <StateView empty="Aucune note pour ce client." />
          )}

          <Text style={styles.heading}>Historique</Text>
          {resource.data.history.reservations?.slice(0, 8).map((reservation) => (
            <View key={reservation.id} style={styles.historyRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="fitness-outline" size={18} color={colors.ink} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{reservation.annonce ? annonceTitle(reservation.annonce) : reservation.title || 'Seance Gotfit'}</Text>
                <Text style={styles.meta}>{formatDate(reservationDate(reservation), true)}</Text>
              </View>
              <Text style={styles.status}>{statusLabel(reservation.status)}</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function Answers({ assessment }: { assessment: FitnessAssessment }) {
  const entries = Object.entries(assessment.answers || {}).slice(0, 6);
  if (!entries.length) return null;
  return (
    <View style={styles.answers}>
      {entries.map(([key, value]) => (
        <Text key={key} style={styles.answerText}>
          {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
        </Text>
      ))}
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: colors.paper, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  name: { fontFamily: fonts.display, fontSize: 23, color: colors.ink },
  email: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  metric: { flex: 1, backgroundColor: colors.paper, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, alignItems: 'center' },
  metricValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  metricLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted },
  heading: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  card: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  answers: { backgroundColor: colors.canvas, borderRadius: radii.md, padding: spacing.md, gap: 5 },
  answerText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  note: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginTop: spacing.sm },
  noteText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.muted, marginTop: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 42 },
  toggleText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  historyRow: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  status: { fontFamily: fonts.bold, fontSize: 9, color: colors.brandStrong },
});
