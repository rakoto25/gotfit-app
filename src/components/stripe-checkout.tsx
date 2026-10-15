import Ionicons from '@expo/vector-icons/Ionicons';
import { useStripe } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, TopBar } from '@/components/ui';
import { createPaymentIntent } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

const stripeConfigured = Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function StripeCheckout({
  reservationId,
  required = false,
}: {
  reservationId: string;
  required?: boolean;
}) {
  if (!stripeConfigured) return <StripeConfiguration required={required} />;
  return <CheckoutFlow reservationId={reservationId} required={required} />;
}

function CheckoutFlow({
  reservationId,
  required,
}: {
  reservationId: string;
  required: boolean;
}) {
  const { token, user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  async function pay() {
    if (!token) return router.replace('/auth/login');
    setLoading(true);
    try {
      const intent = await createPaymentIntent(token, reservationId);
      if (!intent.clientSecret) {
        throw new Error('Le serveur n’a pas retourné le secret de paiement.');
      }
      const initialized = await initPaymentSheet({
        merchantDisplayName: 'Gotfit',
        paymentIntentClientSecret: intent.clientSecret,
        returnURL: 'gotfit://stripe-redirect',
        defaultBillingDetails: { name: user?.name, email: user?.email },
        appearance: {
          colors: {
            primary: colors.ink,
            background: colors.paper,
            componentBackground: colors.canvas,
            componentBorder: colors.line,
            primaryText: colors.ink,
            secondaryText: colors.muted,
          },
          shapes: { borderRadius: 18, borderWidth: 1 },
        },
      });
      if (initialized.error) throw new Error(initialized.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code === 'Canceled') return;
        throw new Error(result.error.message);
      }

      Alert.alert(
        'Paiement réussi ✨',
        'Votre réservation est réglée. Le statut sera actualisé dans quelques instants.',
        [
          {
            text: 'Voir la réservation',
            onPress: () =>
              router.replace({
                pathname: '/reservations/[id]',
                params: { id: reservationId },
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Paiement impossible',
        error instanceof Error ? error.message : 'Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar
        back={!required}
        title="Paiement sécurisé"
        subtitle={`Réservation #${reservationId}`}
      />
      <View style={styles.hero}>
        <View style={styles.lock}>
          <Ionicons name="shield-checkmark" size={33} color={colors.ink} />
        </View>
        <Text style={styles.title}>Réglez en toute confiance.</Text>
        <Text style={styles.text}>
          Le paiement est traité directement par Stripe. Gotfit ne voit ni ne conserve
          vos données bancaires.
        </Text>
      </View>
      {required ? (
        <View style={styles.requiredNotice}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.brandStrong} />
          <Text style={styles.requiredText}>
            Le paiement est nécessaire pour envoyer définitivement la demande au
            coach. En cas d’interruption, vous pourrez reprendre depuis votre planning.
          </Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Line icon="lock-closed-outline" text="Paiement chiffré" />
        <Line icon="card-outline" text="Carte bancaire et moyens compatibles" />
        <Line
          icon="receipt-outline"
          text="Confirmation automatique dans votre planning"
        />
        <Button loading={loading} variant="lime" icon="card-outline" onPress={pay}>
          Ouvrir le paiement Stripe
        </Button>
      </View>
    </Screen>
  );
}

function StripeConfiguration({ required }: { required: boolean }) {
  return (
    <Screen>
      <TopBar back={!required} title="Paiement sécurisé" />
      <View style={styles.hero}>
        <View style={styles.lock}>
          <Ionicons name="construct-outline" size={33} color={colors.ink} />
        </View>
        <Text style={styles.title}>Stripe est prêt à être activé.</Text>
        <Text style={styles.text}>
          Ajoutez votre clé publique Stripe dans EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
          puis redémarrez Expo.
        </Text>
      </View>
    </Screen>
  );
}

function Line({
  icon,
  text,
}: {
  icon: 'lock-closed-outline' | 'card-outline' | 'receipt-outline';
  text: string;
}) {
  return (
    <View style={styles.line}>
      <View style={styles.lineIcon}>
        <Ionicons name={icon} size={19} color={colors.ink} />
      </View>
      <Text style={styles.lineText}>{text}</Text>
      <Ionicons name="checkmark-circle" size={19} color={colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  lock: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 29,
    lineHeight: 33,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 18,
    color: 'rgba(255,255,255,.68)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  requiredNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.sageDeep,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  requiredText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 15,
    color: colors.inkSoft,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lineIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineText: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.ink,
  },
});
