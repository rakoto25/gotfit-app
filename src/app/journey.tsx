import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Avatar, Button, Screen, StateView, TopBar } from '@/components/ui';
import { fetchOnboarding, fetchReservations, getAssetUrl } from '@/lib/api';
import { annonceTitle, formatDate, hasRole, reservationDate, statusLabel } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';
import type { Reservation, User } from '@/types';

export default function JourneyScreen() {
  const { token, user } = useAuth();
  const isCoach = hasRole(user, 'intervenant');
  const resource = useResource(
    async () => {
      if (!token) return { reservations: [] as Reservation[], goals: 0 };
      const [reservations, onboarding] = await Promise.all([
        fetchReservations(token, isCoach),
        isCoach ? Promise.resolve(null) : fetchOnboarding(token).catch(() => null),
      ]);
      return { reservations, goals: onboarding?.goals?.length || 0 };
    },
    [token, isCoach]
  );
  const reservations = resource.data?.reservations || [];
  const completed = reservations.filter(
    (item) => String(item.status || '').toLowerCase() === 'realise'
  ).length;
  const paid = reservations.filter((item) => Boolean(item.is_paid) || item.payment_status === 'paid').length;
  const clients = uniqueClients(reservations);

  if (!token) {
    return (
      <Screen>
        <TopBar back title="Parcours" />
        <AuthGate message="Connectez-vous pour retrouver votre parcours Gotfit." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Parcours" subtitle={isCoach ? 'Suivi de vos clients' : 'Votre progression'} />
      {resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric icon="calendar-outline" value={String(reservations.length)} label="Seances" />
            <Metric icon="checkmark-done-outline" value={String(completed)} label="Realisees" />
            <Metric icon={isCoach ? 'people-outline' : 'sparkles-outline'} value={String(isCoach ? clients.length : resource.data?.goals || 0)} label={isCoach ? 'Clients' : 'Objectifs'} />
            <Metric icon="card-outline" value={String(paid)} label="Payees" />
          </View>

          {!isCoach ? (
            <View style={styles.cta}>
              <View style={styles.flex}>
                <Text style={styles.ctaTitle}>Bilan de forme</Text>
                <Text style={styles.ctaText}>Mettez a jour votre niveau, vos contraintes et vos objectifs.</Text>
              </View>
              <Button full={false} variant="lime" icon="clipboard-outline" onPress={() => router.push('/fitness-assessment' as never)}>
                Ouvrir
              </Button>
            </View>
          ) : null}

          {isCoach ? (
            <>
              <Text style={styles.heading}>Clients accompagnes</Text>
              {clients.length ? (
                clients.map((client) => (
                  <Pressable
                    key={client.id}
                    style={({ pressed }) => [styles.client, pressed && styles.pressed]}
                    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: String(client.id) } } as never)}
                  >
                    <Avatar name={client.name} uri={getAssetUrl(client.photo_url || client.photo)} size={48} />
                    <View style={styles.flex}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientText}>{client.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color={colors.muted} />
                  </Pressable>
                ))
              ) : (
                <StateView empty="Aucun client avec reservation pour le moment." />
              )}
            </>
          ) : (
            <>
              <Text style={styles.heading}>Dernieres seances</Text>
              {reservations.length ? (
                reservations.slice(0, 8).map((reservation) => (
                  <ReservationRow key={reservation.id} reservation={reservation} />
                ))
              ) : (
                <StateView empty="Vos prochaines reservations apparaitront ici." />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function uniqueClients(reservations: Reservation[]) {
  const map = new Map<number, User>();
  reservations.forEach((reservation) => {
    if (reservation.client?.id) map.set(reservation.client.id, reservation.client);
  });
  return Array.from(map.values());
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: 'calendar-outline' | 'checkmark-done-outline' | 'people-outline' | 'sparkles-outline' | 'card-outline';
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/reservations/[id]', params: { id: reservation.id } })}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="fitness-outline" size={19} color={colors.ink} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{reservation.annonce ? annonceTitle(reservation.annonce) : reservation.title || 'Seance Gotfit'}</Text>
        <Text style={styles.rowText}>{formatDate(reservationDate(reservation), true)}</Text>
      </View>
      <Text style={styles.status}>{statusLabel(reservation.status)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.65 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  metric: { width: '48%', flexGrow: 1, backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, ...shadow },
  metricValue: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: spacing.sm },
  metricLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  cta: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  ctaTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.white },
  ctaText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: 'rgba(255,255,255,.68)', marginTop: 3 },
  heading: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  client: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  clientName: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink },
  clientText: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  row: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  rowIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  rowText: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  status: { fontFamily: fonts.bold, fontSize: 9, color: colors.brandStrong },
});
