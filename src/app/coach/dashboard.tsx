import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnnonceCard, ReservationCard, VisioCard } from '@/components/cards';
import { AuthGate, Button, Screen, SectionHeader, StateView, TopBar } from '@/components/ui';
import { fetchMyAnnonces, fetchReservations, fetchVisioSessions } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function CoachDashboardScreen() {
  const { token, user } = useAuth();
  const allowed = Boolean(token && hasRole(user, 'intervenant'));
  const resource = useResource(async () => {
    if (!token || !user || !allowed) return { annonces: [], reservations: [], visios: [] };
    const [allAnnonces, reservations, visios] = await Promise.all([
      fetchMyAnnonces(token),
      fetchReservations(token, true),
      fetchVisioSessions(token, true),
    ]);
    return {
      annonces: allAnnonces,
      reservations,
      visios,
    };
  }, [token, user?.id, allowed]);
  const data = resource.data || { annonces: [], reservations: [], visios: [] };

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Studio coach" subtitle="Votre activité Gotfit" />
      {!allowed ? (
        <AuthGate message="Cet espace est réservé aux profils coach." />
      ) : resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.hero}>
            <View>
              <Text style={styles.heroLabel}>Bonjour coach</Text>
              <Text style={styles.heroTitle}>{user?.name.split(' ')[0]}, votre impact grandit.</Text>
            </View>
            <Ionicons name="trending-up" size={31} color={colors.lime} />
          </View>
          <View style={styles.metrics}>
            <Metric value={`${data.reservations.length}`} label="Réservations" icon="calendar-outline" />
            <Metric value={`${data.annonces.length}`} label="Annonces" icon="megaphone-outline" />
            <Metric value={`${data.visios.length}`} label="Visios" icon="videocam-outline" />
          </View>
          <View style={styles.actions}>
            <Button full={false} variant="lime" icon="add" onPress={() => router.push('/coach/create-annonce')}>
              Annonce
            </Button>
            <Button full={false} variant="light" icon="videocam-outline" onPress={() => router.push('/coach/create-visio')}>
              Visio
            </Button>
          </View>
          <View style={styles.actions}>
            <Button full={false} variant="light" icon="megaphone-outline" onPress={() => router.push('/coach/annonces')}>
              Mes annonces
            </Button>
            <Button full={false} variant="light" icon="people-outline" onPress={() => router.push('/forum')}>
              Forum coachs
            </Button>
          </View>

          <SectionHeader title="Dernières réservations" />
          {data.reservations.length ? data.reservations.slice(0, 3).map((item) => (
            <ReservationCard
              key={item.id}
              item={item}
              onPress={() =>
                router.push({ pathname: '/reservations/[id]', params: { id: item.id } })
              }
            />
          )) : <StateView empty="Vos réservations apparaîtront ici." />}

          <SectionHeader title="Mes annonces" />
          <View style={styles.list}>
            {data.annonces.length ? data.annonces.slice(0, 3).map((item) => (
              <AnnonceCard key={item.id} item={item} onPress={() => router.push({ pathname: '/annonces/[id]', params: { id: item.id } })} />
            )) : <StateView empty="Publiez votre première annonce." />}
          </View>

          <SectionHeader title="Mes sessions visio" />
          {data.visios.length ? data.visios.slice(0, 4).map((item) => (
            <VisioCard key={item.id} item={item} onPress={() => router.push({ pathname: '/visio/[id]', params: { id: item.id } })} />
          )) : <StateView empty="Créez une séance live pour votre communauté." />}
        </>
      )}
    </Screen>
  );
}

function Metric({ value, label, icon }: { value: string; label: string; icon: 'calendar-outline' | 'megaphone-outline' | 'videocam-outline' }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={19} color={colors.ink} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.lg },
  heroLabel: { fontFamily: fonts.bold, fontSize: 9, color: colors.lime, textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { maxWidth: 260, fontFamily: fonts.display, fontSize: 25, lineHeight: 29, color: colors.white, marginTop: spacing.sm },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  metricValue: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, marginTop: 4 },
  metricLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  list: { gap: spacing.lg },
});
