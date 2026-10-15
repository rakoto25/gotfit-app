import { StripeProvider } from '@stripe/stripe-react-native';
import type { PropsWithChildren } from 'react';

export function AppStripeProvider({ children }: PropsWithChildren) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) return children;

  return (
    <StripeProvider publishableKey={publishableKey} urlScheme="gotfit">
      <>{children}</>
    </StripeProvider>
  );
}
