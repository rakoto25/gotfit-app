import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ReservationCard } from '@/components/cards';
import { AuthGate, Screen, StateView, TopBar } from '@/components/ui';
import { fetchReservations } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function PlanningScreen() {
  const { token, user } = useAuth();
  const isCoach = hasRole(user, 'intervenant');
  const resource = useResource(
    () => (token ? fetchReservations(token, isCoach) : Promise.resolve([])),
    [token, isCoach]
  );

  if (!token) {
    return (
      <Screen>
        <TopBar title="Planning" subtitle="Votre rythme, en un regard" />
        <AuthGate message="Connectez-vous pour retrouver toutes vos réservations." />
      </Screen>
    );
  }

  const reservations = resource.data || [];
  const future = reservations.filter(
    (item) =>
      !['ended', 'termine', 'cancelled', 'annule', 'refuse'].includes(
        String(item.status || item.prestation_status || '').toLowerCase()
      )
  );
  const past = reservations.filter((item) => !future.includes(item));

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar title="Planning" subtitle={isCoach ? 'Mes rendez-vous coach' : 'Mon parcours Gotfit'} />
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="calendar" size={24} color={colors.ink} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.summaryLabel}>Prochaines séances</Text>
          <Text style={styles.summaryValue}>{future.length} au programme</Text>
        </View>
        <Text style={styles.summarySpark}>↗</Text>
      </View>

      {resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <Text style={styles.heading}>À venir</Text>
          {future.length ? (
            future.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/reservations/[id]',
                    params: { id: item.id },
                  })
                }
              />
            ))
          ) : (
            <StateView empty="Votre prochaine séance se prépare dans Explorer." />
          )}

          {past.length > 0 && (
            <>
              <Text style={styles.heading}>Historique</Text>
              {past.map((item) => (
                <ReservationCard
                  key={item.id}
                  item={item}
                  onPress={() =>
                    router.push({ pathname: '/reservations/[id]', params: { id: item.id } })
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    backgroundColor: colors.lime,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.inkSoft },
  summaryValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 2 },
  summarySpark: { fontFamily: fonts.extraBold, fontSize: 25, color: colors.ink },
  heading: { fontFamily: fonts.extraBold, fontSize: 21, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.lg },
});
