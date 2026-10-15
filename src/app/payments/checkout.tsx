import { useLocalSearchParams } from 'expo-router';

import StripeCheckout from '@/components/stripe-checkout';

export default function CheckoutScreen() {
  const { reservationId, required } = useLocalSearchParams<{
    reservationId: string;
    required?: string;
  }>();
  return (
    <StripeCheckout
      reservationId={reservationId}
      required={required === '1'}
    />
  );
}
