import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, TopBar } from '@/components/ui';
import { WEB_URL } from '@/lib/api';
import { colors, fonts, radii, spacing } from '@/theme';

export default function StripeCheckout({ reservationId }: { reservationId: string }) {
  return (
    <Screen>
      <TopBar back title="Paiement sécurisé" subtitle={`Réservation #${reservationId}`} />
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="phone-portrait-outline" size={34} color={colors.ink} />
        </View>
        <Text style={styles.title}>Paiement disponible dans l’application.</Text>
        <Text style={styles.text}>
          La feuille Stripe native fonctionne sur Android et iOS. Depuis un navigateur,
          poursuivez sur le site Gotfit ou ouvrez cette réservation dans l’application.
        </Text>
        <Button
          variant="lime"
          icon="open-outline"
          onPress={() => Linking.openURL(WEB_URL)}>
          Continuer sur Gotfit
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.lg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 27,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    color: colors.white,
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 20,
    color: 'rgba(255,255,255,.7)',
    textAlign: 'center',
  },
});
