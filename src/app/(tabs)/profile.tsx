import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Avatar, Button, Screen, StateView, Tag, TopBar } from '@/components/ui';
import { fetchOnboarding, fetchPayments, fetchReservations, getAssetUrl } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const baseItems = [
  { icon: 'notifications-outline', title: 'Mes notifications', route: '/notifications' },
  { icon: 'layers-outline', title: 'Mes packs et séances', route: '/packs' },
  { icon: 'person-outline', title: 'Modifier mon profil', route: '/profile/edit' },
  { icon: 'heart-outline', title: 'Mes favoris', route: '/favorites' },
  { icon: 'card-outline', title: 'Mes paiements', route: '/payments' },
  { icon: 'help-buoy-outline', title: 'Centre d’aide', route: '/help' },
  { icon: 'mail-outline', title: 'Nous contacter', route: '/contact' },
] as const;

export default function ProfileScreen() {
  const { token, user, signOut } = useAuth();
  const isCoach = hasRole(user, 'intervenant');
  const metrics = useResource(
    async () => {
      if (!token || !user) return { sessions: 0, completed: 0, goals: 0, payments: 0 };
      const [reservations, onboarding, payments] = await Promise.all([
        fetchReservations(token, isCoach).catch(() => []),
        isCoach ? Promise.resolve(null) : fetchOnboarding(token).catch(() => null),
        fetchPayments(token).catch(() => []),
      ]);
      return {
        sessions: reservations.length,
        completed: reservations.filter((item) => String(item.status || '').toLowerCase() === 'realise').length,
        goals: onboarding?.goals?.length || 0,
        payments: payments.length,
      };
    },
    [token, user?.id, isCoach]
  );

  if (!token || !user) {
    return (
      <Screen>
        <TopBar title="Profil" subtitle="Votre espace personnel" />
        <AuthGate />
      </Screen>
    );
  }

  const menuItems = [
    ...(!isCoach
      ? [
          { icon: 'sparkles-outline', title: 'Mes objectifs', route: '/onboarding' },
          { icon: 'clipboard-outline', title: 'Bilan de forme', route: '/fitness-assessment' },
          { icon: 'megaphone-outline', title: 'Publier une demande', route: '/annonces/create-request' },
          { icon: 'list-outline', title: 'Mes annonces', route: '/annonces/mine' },
        ]
      : [
          { icon: 'document-text-outline', title: 'Documents coach', route: '/coach/documents' },
          { icon: 'wallet-outline', title: 'Paiements coach', route: '/coach/stripe' },
          { icon: 'megaphone-outline', title: 'Mes annonces', route: '/coach/annonces' },
          { icon: 'people-outline', title: 'Forum des coachs', route: '/forum' },
        ]),
    { icon: 'analytics-outline', title: isCoach ? 'Parcours de mes clients' : 'Mon parcours et mes notes', route: '/journey' },
    ...baseItems,
  ] as const;

  return (
    <Screen>
      <TopBar title="Profil" subtitle="Votre espace personnel" />
      <View style={styles.profile}>
        <Avatar
          name={user.name}
          uri={getAssetUrl(user.photo_url || user.photo)}
          size={96}
          ring
        />
        <Text style={styles.name}>{user.display_name || user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Tag tone={isCoach ? 'coral' : 'lime'}>{isCoach ? 'Coach Gotfit' : 'Membre Gotfit'}</Tag>
        <View style={styles.metrics}>
          <Metric value={String(metrics.data?.sessions || 0)} label="Seances" />
          <Metric value={String(isCoach ? metrics.data?.completed || 0 : metrics.data?.goals || 0)} label={isCoach ? 'Realisees' : 'Objectifs'} />
          <Metric value={String(metrics.data?.payments || 0)} label="Paiements" />
        </View>
      </View>

      {metrics.error ? (
        <StateView error={metrics.error} onRetry={metrics.reload} />
      ) : null}

      {isCoach && (
        <Pressable style={styles.coach} onPress={() => router.push('/coach/dashboard')}>
          <View style={styles.coachIcon}>
            <Ionicons name="stats-chart" size={23} color={colors.lime} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.coachTitle}>Espace coach</Text>
            <Text style={styles.coachText}>Annonces, visio et activité</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </Pressable>
      )}

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            onPress={() => router.push(item.route as never)}>
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon as IconName} size={20} color={colors.ink} />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={19} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Button
        variant="light"
        icon="log-out-outline"
        onPress={() =>
          Alert.alert('Se déconnecter ?', 'Votre session sera fermée sur cet appareil.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnexion', style: 'destructive', onPress: signOut },
          ])
        }>
        Se déconnecter
      </Button>
      <Text style={styles.version}>Gotfit mobile · version 1.4.0</Text>
    </Screen>
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
  pressed: { opacity: 0.6 },
  profile: {
    backgroundColor: colors.paper,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.lg,
    ...shadow,
  },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginTop: spacing.md },
  email: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginBottom: spacing.md },
  metrics: {
    width: '100%',
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontFamily: fonts.display, fontSize: 21, color: colors.ink },
  metricLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  coach: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  coachIcon: {
    width: 47,
    height: 47,
    borderRadius: 17,
    backgroundColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.white },
  coachText: { fontFamily: fonts.regular, fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 2 },
  menu: {
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  menuItem: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  version: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
});
