import Ionicons from '@expo/vector-icons/Ionicons';
import * as Calendar from 'expo-calendar';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Field, Screen, StateView, Tag, TopBar } from '@/components/ui';
import {
  confirmPrestation,
  disputePrestation,
  fetchReservation,
  getAssetUrl,
  submitReview,
  updateReservationStatus,
} from '@/lib/api';
import {
  annonceTitle,
  canReviewReservation,
  formatDate,
  formatMoney,
  hasRole,
  isReservationPaid,
  parseDate,
  reservationDate,
  statusLabel,
} from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [working, setWorking] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [dispute, setDispute] = useState('');
  const resource = useResource(
    () => (token ? fetchReservation(token, id) : Promise.reject(new Error('Connexion requise.'))),
    [token, id]
  );
  const reservation = resource.data;
  const coachMode = hasRole(user, 'intervenant');

  async function act(action: 'valider' | 'refuser' | 'terminer') {
    if (!token) return;
    setWorking(true);
    try {
      await updateReservationStatus(token, id, action);
      await resource.reload();
      Alert.alert('Réservation actualisée', action === 'valider' ? 'La séance est confirmée.' : action === 'refuser' ? 'La demande a été refusée.' : 'La séance est marquée comme terminée.');
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function confirmService() {
    if (!token) return;
    setWorking(true);
    try {
      await confirmPrestation(token, id);
      await resource.reload();
      Alert.alert('Merci ✨', 'La prestation est confirmée et le coach pourra être rémunéré.');
    } catch (error) {
      Alert.alert('Confirmation impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function sendDispute() {
    if (!token || !dispute.trim()) return Alert.alert('Motif requis', 'Expliquez brièvement le problème rencontré.');
    setWorking(true);
    try {
      await disputePrestation(token, id, dispute);
      setDispute('');
      await resource.reload();
      Alert.alert('Demande transmise', 'L’équipe Gotfit examinera votre demande.');
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function review() {
    if (!token) return;
    if (rating < 1 || rating > 5) {
      return Alert.alert('Note invalide', 'Choisissez une note entre 1 et 5.');
    }
    if (comment.trim().length > 2000) {
      return Alert.alert('Commentaire trop long', 'Votre avis doit contenir 2000 caracteres maximum.');
    }
    setWorking(true);
    try {
      await submitReview(token, id, rating, comment);
      setComment('');
      await resource.reload();
      Alert.alert('Avis enregistré ✨', 'Merci d’aider la communauté Gotfit.');
    } catch (error) {
      Alert.alert('Avis impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function addToCalendar() {
    if (!reservation) return;
    const start = parseDate(reservationDate(reservation));
    if (!start) {
      return Alert.alert(
        'Date indisponible',
        "Cette réservation n'a pas encore de date valide à ajouter au calendrier."
      );
    }

    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) return Alert.alert('Calendrier', 'Autorisez Gotfit à accéder au calendrier.');
    try {
      const selected = await Calendar.getDefaultCalendarAsync();
      const duration = Number(reservation.annonce?.duration || 60);
      await Calendar.createEventAsync(selected.id, {
        title: reservation.annonce ? annonceTitle(reservation.annonce) : 'Séance Gotfit',
        startDate: start,
        endDate: new Date(start.getTime() + duration * 60000),
        location:
          reservation.annonce?.is_online
            ? 'En ligne'
            : reservation.annonce?.address || reservation.annonce?.location || 'Gotfit',
        notes: `Réservation Gotfit #${reservation.id}`,
      });
      Alert.alert('Ajoutée au calendrier', 'Un rappel est maintenant enregistré sur votre téléphone.');
    } catch {
      Alert.alert('Calendrier indisponible', 'Impossible de créer cet événement sur cet appareil.');
    }
  }

  if (!token) {
    router.replace('/auth/login');
    return null;
  }

  const status = String(reservation?.status || '').toLowerCase();
  const paid = isReservationPaid(reservation);
  const closedStatuses = [
    'cancelled',
    'annule',
    'refuse',
    'ended',
    'termine',
    'realise',
  ];
  const canPay = !coachMode && !paid && !closedStatuses.includes(status);
  const pendingValidation = reservation?.prestation_status === 'pending_validation';
  const canReschedule =
    !coachMode && !closedStatuses.includes(status) && !pendingValidation;
  const canReview = !coachMode && canReviewReservation(reservation);

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Détail de la séance" subtitle={`Réservation #${id}`} />
      {resource.loading || resource.error || !reservation ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name={reservation.visio_session_id ? 'videocam' : 'fitness'} size={27} color={colors.ink} />
              </View>
              <Tag tone={paid ? 'lime' : 'coral'}>{paid ? 'Payée' : 'Paiement en attente'}</Tag>
            </View>
            <Text style={styles.heroTitle}>
              {reservation.annonce ? annonceTitle(reservation.annonce) : reservation.title || 'Séance Gotfit'}
            </Text>
            <Text style={styles.heroDate}>{formatDate(reservationDate(reservation), true)}</Text>
            <View style={styles.heroFooter}>
              <Tag tone="dark">{statusLabel(reservation.status)}</Tag>
              <Text style={styles.price}>
                {formatMoney(reservation.total_client_amount || reservation.price, reservation.currency || 'EUR')}
              </Text>
            </View>
          </View>

          <View style={styles.person}>
            <Avatar
              name={coachMode ? reservation.client?.name : reservation.intervenant?.name}
              uri={getAssetUrl(
                coachMode
                  ? reservation.client?.photo_url || reservation.client?.photo
                  : reservation.intervenant?.photo_url || reservation.intervenant?.photo
              )}
              size={58}
            />
            <View style={styles.flex}>
              <Text style={styles.personLabel}>{coachMode ? 'Membre accompagné' : 'Votre coach'}</Text>
              <Text style={styles.personName}>
                {(coachMode ? reservation.client?.name : reservation.intervenant?.name) || 'Membre Gotfit'}
              </Text>
            </View>
            <Pressable style={styles.calendar} onPress={addToCalendar}>
              <Ionicons name="calendar-outline" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.details}>
            <Detail label="Statut" value={statusLabel(reservation.status)} />
            <Detail label="Paiement" value={paid ? 'Réglé' : statusLabel(reservation.payment_status)} />
            <Detail label="Format" value={reservation.visio_session_id || reservation.annonce?.is_online ? 'En visio' : 'Présentiel'} />
            <Detail label="Participants" value={`${reservation.guests || 1}`} />
          </View>

          {reservation.note ? (
            <View style={styles.note}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.ink} />
              <Text style={styles.noteText}>{reservation.note}</Text>
            </View>
          ) : null}

          {reservation.review ? (
            <View style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <View style={styles.flex}>
                  <Text style={styles.actionTitle}>Votre avis</Text>
                  <Text style={styles.reviewMeta}>
                    {reservation.review.status ? statusLabel(reservation.review.status) : 'Publie'}
                  </Text>
                </View>
                <View style={styles.starsCompact}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Ionicons
                      key={value}
                      name={value <= Number(reservation.review?.rating || 0) ? 'star' : 'star-outline'}
                      size={17}
                      color={colors.warning}
                    />
                  ))}
                </View>
              </View>
              {reservation.review.comment ? (
                <Text style={styles.reviewText}>{reservation.review.comment}</Text>
              ) : null}
            </View>
          ) : null}

          {canReschedule || canPay ? (
            <View style={styles.clientActions}>
              {canReschedule ? (
                <Button
                  variant="light"
                  icon="calendar-outline"
                  onPress={() =>
                    router.push({
                      pathname: '/reservations/[id]/edit',
                      params: { id },
                    })
                  }
                >
                  Modifier la date ou l’heure
                </Button>
              ) : null}
              {canPay ? (
                <Button
                  variant="lime"
                  icon="card-outline"
                  onPress={() =>
                    router.push({
                      pathname: '/payments/checkout',
                      params: { reservationId: id, required: '1' },
                    })
                  }
                >
                  Payer pour transmettre au coach
                </Button>
              ) : null}
            </View>
          ) : null}

          {coachMode &&
            !paid &&
            ['attente', 'pending', 'en_attente'].includes(status) && (
              <View style={styles.paymentWaiting}>
                <Ionicons name="hourglass-outline" size={22} color={colors.brandStrong} />
                <View style={styles.flex}>
                  <Text style={styles.paymentWaitingTitle}>
                    Paiement du client en attente
                  </Text>
                  <Text style={styles.paymentWaitingText}>
                    La confirmation du créneau sera disponible dès que Stripe aura
                    validé le règlement.
                  </Text>
                </View>
              </View>
            )}

          {coachMode &&
            paid &&
            ['attente', 'pending', 'en_attente'].includes(status) && (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Répondre à la demande</Text>
              <Text style={styles.actionText}>Confirmez le créneau ou refusez-le si vous n’êtes pas disponible.</Text>
              <View style={styles.row}>
                <Button full={false} loading={working} variant="lime" onPress={() => act('valider')}>Confirmer</Button>
                <Button full={false} disabled={working} variant="danger" onPress={() => act('refuser')}>Refuser</Button>
              </View>
            </View>
          )}

          {coachMode && ['confirme', 'confirmed'].includes(status) && paid && (
            <Button loading={working} icon="checkmark-done-outline" onPress={() => act('terminer')}>
              Marquer la séance terminée
            </Button>
          )}

          {!coachMode && Boolean(reservation.visio_session_id) && paid && (
            <Button
              variant="light"
              icon="videocam-outline"
              onPress={() =>
                router.push({ pathname: '/visio/[id]', params: { id: reservation.visio_session_id! } })
              }>
              Ouvrir la séance visio
            </Button>
          )}

          {!coachMode && pendingValidation && (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>La séance s’est bien passée ?</Text>
              <Text style={styles.actionText}>Votre confirmation déclenche la validation de la prestation.</Text>
              <Button loading={working} variant="lime" onPress={confirmService}>Oui, je confirme</Button>
              <Field label="Signaler un problème" value={dispute} onChangeText={setDispute} placeholder="Décrivez le problème…" multiline />
              <Button disabled={working} variant="danger" onPress={sendDispute}>Ouvrir un litige</Button>
            </View>
          )}

          {canReview && (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Votre avis compte</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} onPress={() => setRating(value)}>
                    <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={29} color={colors.warning} />
                  </Pressable>
                ))}
              </View>
              <Field label="Commentaire" value={comment} onChangeText={setComment} placeholder="Partagez votre expérience…" multiline />
              <Button loading={working} variant="lime" onPress={review}>Publier mon avis</Button>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  hero: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.xl, marginVertical: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIcon: { width: 55, height: 55, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 31, lineHeight: 35, color: colors.white, marginTop: spacing.xl },
  heroDate: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,.68)', marginTop: spacing.sm },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl },
  price: { fontFamily: fonts.display, fontSize: 24, color: colors.white },
  person: { backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.line },
  personLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  personName: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink, marginTop: 2 },
  calendar: { width: 43, height: 43, borderRadius: 16, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.lg },
  detail: { width: '48%', flexGrow: 1, backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  detailLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted },
  detailValue: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink, marginTop: 3 },
  note: { backgroundColor: colors.lime, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, color: colors.ink },
  reviewCard: { backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.lg },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewMeta: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  reviewText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.muted, marginTop: spacing.md },
  actionCard: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.line },
  clientActions: { gap: spacing.sm, marginBottom: spacing.lg },
  paymentWaiting: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.sageDeep,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  paymentWaitingTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.ink,
  },
  paymentWaitingText: {
    fontFamily: fonts.regular,
    fontSize: 9,
    lineHeight: 14,
    color: colors.muted,
    marginTop: 3,
  },
  actionTitle: { fontFamily: fonts.display, fontSize: 23, color: colors.ink },
  actionText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: colors.muted },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  starsCompact: { flexDirection: 'row', gap: 2 },
});
