import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  Field,
  Screen,
  StateView,
  TopBar,
} from '@/components/ui';
import {
  fetchReservation,
  rescheduleReservation,
  sendMessage,
  startConversation,
} from '@/lib/api';
import {
  formatDate,
  parseDate,
  reservationDate,
} from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function EditReservationScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const resource = useResource(
    () =>
      token
        ? fetchReservation(token, id)
        : Promise.reject(new Error('Connexion requise.')),
    [token, id]
  );
  const reservation = resource.data;
  const initialDate = useMemo(() => {
    if (!reservation) return null;

    const current = parseDate(reservationDate(reservation));
    if (current) return current;

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(10, 0, 0, 0);
    return fallback;
  }, [reservation]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const date = selectedDate || initialDate;
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!token || !reservation || !date) return;

    const previousDate = reservationDate(reservation);
    if (date.getTime() <= Date.now()) {
      return Alert.alert(
        'Créneau incorrect',
        'Choisissez une date et une heure situées dans le futur.'
      );
    }

    setSaving(true);
    try {
      const result = await rescheduleReservation(token, id, {
        reservation_date: date.toISOString().slice(0, 10),
        reservation_time: date.toTimeString().slice(0, 8),
        note: reason.trim() || undefined,
      });

      let coachNotified = result.coachNotified;
      const coachId =
        result.reservation.intervenant_id ||
        result.reservation.annonce?.user_id ||
        reservation.intervenant_id ||
        reservation.annonce?.user_id;

      if (coachId) {
        try {
          const conversation = await startConversation(token, coachId);
          await sendMessage(
            token,
            conversation.id,
            [
              `Créneau modifié pour la réservation #${id}.`,
              `Ancien créneau : ${formatDate(previousDate, true)}.`,
              `Nouveau créneau : ${formatDate(date, true)}.`,
              reason.trim() ? `Message du client : ${reason.trim()}` : '',
              'Merci de vérifier et confirmer ce nouveau créneau.',
            ]
              .filter(Boolean)
              .join('\n')
          );
          coachNotified = true;
        } catch {
          // La modification reste enregistrée même si la messagerie est
          // temporairement indisponible. L'API peut déjà avoir notifié le coach.
        }
      }

      Alert.alert(
        'Créneau modifié',
        coachNotified
          ? 'Le nouveau créneau est enregistré et votre coach a été prévenu.'
          : 'Le nouveau créneau est enregistré. La notification automatique sera traitée par le serveur.',
        [
          {
            text: 'Voir la réservation',
            onPress: () =>
              router.replace({
                pathname: '/reservations/[id]',
                params: { id },
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Modification impossible',
        error instanceof Error ? error.message : 'Veuillez réessayer.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <Screen>
      <TopBar
        back
        title="Modifier le créneau"
        subtitle={`Réservation #${id}`}
      />

      {resource.loading || resource.error || !reservation || !date ? (
        <StateView
          loading={resource.loading || (!date && !resource.error)}
          error={resource.error}
          onRetry={resource.reload}
        />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="calendar-outline" size={27} color={colors.ink} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroEyebrow}>Créneau actuel</Text>
              <Text style={styles.heroDate}>
                {formatDate(reservationDate(reservation), true)}
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.title}>Choisissez le nouveau moment</Text>
              <Text style={styles.subtitle}>
                Le coach recevra le changement et pourra valider à nouveau sa
                disponibilité. Un paiement déjà effectué reste associé à la
                réservation.
              </Text>
            </View>

            <View style={styles.selectors}>
              <Pressable
                style={styles.selector}
                onPress={() => setPicker('date')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={colors.brandStrong}
                />
                <View>
                  <Text style={styles.selectorLabel}>Nouvelle date</Text>
                  <Text style={styles.selectorValue}>
                    {new Intl.DateTimeFormat('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                    }).format(date)}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.selector}
                onPress={() => setPicker('time')}
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={colors.brandStrong}
                />
                <View>
                  <Text style={styles.selectorLabel}>Nouvelle heure</Text>
                  <Text style={styles.selectorValue}>
                    {new Intl.DateTimeFormat('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(date)}
                  </Text>
                </View>
              </Pressable>
            </View>

            {picker ? (
              <DateTimePicker
                value={date}
                mode={picker}
                minimumDate={picker === 'date' ? new Date() : undefined}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={(_, value) => {
                  setSelectedDate(value);
                  if (Platform.OS !== 'ios') setPicker(null);
                }}
                onDismiss={() => {
                  if (Platform.OS !== 'ios') setPicker(null);
                }}
              />
            ) : null}

            {Platform.OS === 'ios' && picker ? (
              <Button
                full={false}
                variant="light"
                onPress={() => setPicker(null)}
              >
                Valider le créneau
              </Button>
            ) : null}

            <Field
              label="Message pour le coach"
              icon="chatbubble-ellipses-outline"
              value={reason}
              onChangeText={setReason}
              placeholder="Expliquez brièvement la raison du changement…"
              multiline
            />

            <View style={styles.notice}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.brandStrong}
              />
              <Text style={styles.noticeText}>
                Après validation, Gotfit enverra au coach l’ancien et le nouveau
                créneau dans la messagerie.
              </Text>
            </View>

            <Button
              loading={saving}
              variant="lime"
              icon="notifications-outline"
              onPress={save}
            >
              Modifier et prévenir le coach
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginVertical: spacing.lg,
  },
  heroIcon: {
    width: 55,
    height: 55,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,.58)',
  },
  heroDate: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.white,
    marginTop: 4,
  },
  form: {
    backgroundColor: colors.paper,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 16,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  selectors: { gap: spacing.sm },
  selector: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
  },
  selectorLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.muted,
  },
  selectorValue: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.sageDeep,
    padding: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 14,
    color: colors.inkSoft,
  },
});
