import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Screen, StateView, Tag, TopBar } from '@/components/ui';
import { fetchPayments } from '@/lib/api';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function PaymentsScreen() {
  const { token } = useAuth();
  const resource = useResource(
    () => (token ? fetchPayments(token) : Promise.resolve([])),
    [token]
  );
  const payments = resource.data || [];
  const total = payments
    .filter((item) => ['paid', 'transferred'].includes(String(item.status)))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Mes paiements" subtitle="Un historique clair et sécurisé" />
      {!token ? (
        <AuthGate />
      ) : (
        <>
          <View style={styles.total}>
            <View style={styles.totalIcon}><Ionicons name="wallet" size={25} color={colors.ink} /></View>
            <View style={styles.flex}>
              <Text style={styles.totalLabel}>Total réglé</Text>
              <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            </View>
            <Tag tone="dark">Stripe</Tag>
          </View>
          {resource.loading || resource.error ? (
            <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
          ) : payments.length ? (
            <View style={styles.list}>
              {payments.map((payment) => (
                <Pressable
                  key={payment.id}
                  style={styles.payment}
                  onPress={() =>
                    payment.reservation_id &&
                    router.push({
                      pathname: '/reservations/[id]',
                      params: { id: payment.reservation_id },
                    })
                  }>
                  <View style={styles.paymentIcon}><Ionicons name="receipt-outline" size={20} color={colors.ink} /></View>
                  <View style={styles.flex}>
                    <Text style={styles.paymentTitle}>Réservation #{payment.reservation_id || '—'}</Text>
                    <Text style={styles.paymentDate}>{formatDate(payment.created_at, true)}</Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>{formatMoney(payment.amount, payment.currency || 'EUR')}</Text>
                    <Text style={styles.paymentStatus}>{statusLabel(payment.status)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <StateView empty="Vos futurs paiements apparaîtront ici." />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  total: { backgroundColor: colors.lime, borderRadius: radii.xl, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  totalIcon: { width: 53, height: 53, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.58)', alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontFamily: fonts.bold, fontSize: 9, color: colors.inkSoft },
  totalValue: { fontFamily: fonts.display, fontSize: 25, color: colors.ink, marginTop: 2 },
  list: { backgroundColor: colors.paper, borderRadius: radii.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.line },
  payment: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  paymentIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink },
  paymentDate: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted, marginTop: 3 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink },
  paymentStatus: { fontFamily: fonts.regular, fontSize: 8, color: colors.success, marginTop: 2 },
});
