import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Button, Screen, StateView, Tag, TopBar } from '@/components/ui';
import {
  createStripeConnectOnboarding,
  fetchCoachRevenue,
  fetchStripeConnectStatus,
} from '@/lib/api';
import { formatMoney, hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function CoachStripeScreen() {
  const { token, user } = useAuth();
  const [working, setWorking] = useState(false);
  const isCoach = hasRole(user, 'intervenant');
  const resource = useResource(
    async () => {
      if (!token || !isCoach) return { status: null, revenue: null };
      const [status, revenue] = await Promise.all([
        fetchStripeConnectStatus(token),
        fetchCoachRevenue(token).catch(() => null),
      ]);
      return { status, revenue };
    },
    [token, isCoach]
  );
  const status = resource.data?.status;
  const ready = Boolean(status?.onboarding_completed && status?.charges_enabled && status?.payouts_enabled);

  async function openOnboarding() {
    if (!token) return;
    setWorking(true);
    try {
      const response = await createStripeConnectOnboarding(token);
      if (!response.url) throw new Error('Lien Stripe indisponible.');
      await WebBrowser.openBrowserAsync(response.url);
      await resource.reload();
    } catch (error) {
      Alert.alert('Stripe indisponible', error instanceof Error ? error.message : 'Veuillez reessayer.');
    } finally {
      setWorking(false);
    }
  }

  if (!token || !isCoach) {
    return (
      <Screen>
        <TopBar back title="Paiements coach" />
        <AuthGate message="Cet espace est reserve aux coachs Gotfit connectes." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Paiements coach" subtitle="Stripe Connect et revenus" />
      {resource.loading || resource.error || !resource.data ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="card-outline" size={25} color={colors.ink} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroTitle}>Compte de reversement</Text>
              <Text style={styles.heroText}>
                {ready
                  ? 'Votre compte Stripe est pret pour recevoir les reversements.'
                  : 'Terminez Stripe Connect pour recevoir vos paiements coach.'}
              </Text>
            </View>
            <Tag tone={ready ? 'lime' : 'coral'}>{ready ? 'Pret' : 'A completer'}</Tag>
          </View>

          <View style={styles.statusGrid}>
            <StatusItem label="Compte" active={Boolean(status?.connected)} />
            <StatusItem label="Onboarding" active={Boolean(status?.onboarding_completed)} />
            <StatusItem label="Encaissements" active={Boolean(status?.charges_enabled)} />
            <StatusItem label="Reversements" active={Boolean(status?.payouts_enabled)} />
          </View>

          <Button loading={working} variant="lime" icon="open-outline" onPress={openOnboarding}>
            {ready ? 'Gerer mon compte Stripe' : 'Terminer Stripe Connect'}
          </Button>

          <Text style={styles.heading}>Revenus</Text>
          <View style={styles.revenue}>
            <Metric value={formatMoney(resource.data.revenue?.total_paye)} label="Total paye" />
            <Metric value={formatMoney(resource.data.revenue?.total_commission)} label="Commission" />
            <Metric value={formatMoney(resource.data.revenue?.total_recu)} label="A recevoir" />
          </View>
        </>
      )}
    </Screen>
  );
}

function StatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={styles.statusItem}>
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={active ? colors.success : colors.muted}
      />
      <Text style={styles.statusText}>{label}</Text>
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
  hero: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.lg, marginVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.white },
  heroText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: 'rgba(255,255,255,.68)', marginTop: 3 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statusItem: { width: '48%', flexGrow: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  heading: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  revenue: { gap: spacing.sm },
  metric: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, padding: spacing.lg },
  metricValue: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  metricLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 3 },
});
