import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, TopBar } from '@/components/ui';
import { fetchAnnonce, reserveAnnonce } from '@/lib/api';
import { availableTimes, toLocalDate } from '@/lib/availability';
import { annonceTitle, formatMoney } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function NewReservationScreen() {
  const { annonceId } = useLocalSearchParams<{ annonceId: string }>();
  const { token } = useAuth();
  const [date, setDate] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    return next;
  });
  const [picker, setPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const annonceResource = useResource(
    () => fetchAnnonce(annonceId),
    [annonceId]
  );
  const annonce = annonceResource.data;
  const slots = availableTimes(annonce, toLocalDate(date));

  async function submit() {
    if (!token) return router.replace('/auth/login');
    if (!selectedTime || !slots.includes(selectedTime)) {
      return Alert.alert('Créneau requis', 'Choisissez un horaire proposé par le coach.');
    }
    setLoading(true);
    try {
      const reservation = await reserveAnnonce(token, annonceId, {
        reservation_date: toLocalDate(date),
        reservation_time: `${selectedTime}:00`,
        guests: 1,
        note: note.trim() || undefined,
      });

      router.replace({
        pathname: '/payments/checkout',
        params: {
          reservationId: String(reservation.id),
          required: '1',
        },
      });
    } catch (error) {
      Alert.alert('Réservation impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar back title="Réserver" subtitle="Choisissez votre meilleur moment" />
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="calendar" size={26} color={colors.ink} /></View>
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Planifiez votre séance</Text>
          <Text style={styles.heroText}>Le coach validera ce créneau et vous recevrez la confirmation.</Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.orderSummary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.ink} />
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.summaryTitle}>
              {annonce ? annonceTitle(annonce) : 'Réservation Gotfit'}
            </Text>
            <Text style={styles.summaryText}>
              Paiement sécurisé requis pour transmettre la demande au coach
            </Text>
          </View>
          <Text style={styles.summaryPrice}>
            {annonceResource.loading
              ? '…'
              : formatMoney(annonce?.price, 'EUR')}
          </Text>
        </View>

        <Text style={styles.label}>Date souhaitée</Text>
        <View style={styles.selectors}>
          <Pressable style={styles.selector} onPress={() => setPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.ink} />
            <Text style={styles.selectorText}>
              {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date)}
            </Text>
          </Pressable>
        </View>
        {picker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_, value) => {
              setDate(value);
              setSelectedTime('');
              if (Platform.OS !== 'ios') setPicker(false);
            }}
            onDismiss={() => {
              if (Platform.OS !== 'ios') setPicker(false);
            }}
          />
        )}
        {Platform.OS === 'ios' && picker && (
          <Button full={false} variant="light" onPress={() => setPicker(false)}>Valider la date</Button>
        )}
        <Text style={styles.label}>Horaires proposés par le coach</Text>
        <View style={styles.slots}>
          {slots.map((time) => (
            <Pressable key={time} style={[styles.slot, selectedTime === time && styles.slotActive]} onPress={() => setSelectedTime(time)}>
              <Text style={[styles.slotText, selectedTime === time && styles.slotTextActive]}>{time}</Text>
            </Pressable>
          ))}
        </View>
        {!annonceResource.loading && !slots.length ? (
          <Text style={styles.noSlots}>Aucun créneau disponible ce jour. Choisissez une autre date.</Text>
        ) : null}
        <Field
          label="Un message pour le coach"
          icon="chatbubble-outline"
          value={note}
          onChangeText={setNote}
          placeholder="Objectif, besoin particulier, contrainte…"
          multiline
        />
        <View style={styles.paymentNotice}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.brandStrong} />
          <Text style={styles.paymentNoticeText}>
            Après création, vous serez dirigé vers Stripe. Le coach pourra confirmer
            le créneau lorsque le paiement sera validé.
          </Text>
        </View>
        <Button loading={loading} variant="lime" icon="card-outline" onPress={submit}>
          Continuer vers le paiement
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  heroIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.white },
  heroText: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: 'rgba(255,255,255,.65)', marginTop: 3 },
  form: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.line },
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    color: colors.ink,
  },
  summaryText: {
    fontFamily: fonts.regular,
    fontSize: 8,
    lineHeight: 12,
    color: colors.muted,
    marginTop: 3,
  },
  summaryPrice: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.brandStrong,
  },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  selectors: { flexDirection: 'row', gap: spacing.sm },
  selector: { flex: 1, minHeight: 53, borderRadius: radii.md, backgroundColor: colors.canvas, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: spacing.sm },
  selectorText: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { minWidth: 72, minHeight: 42, borderRadius: radii.pill, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  slotActive: { backgroundColor: colors.ink },
  slotText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  slotTextActive: { color: colors.white },
  noSlots: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: colors.danger },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.sageDeep,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  paymentNoticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 14,
    color: colors.inkSoft,
  },
});
