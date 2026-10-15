import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/auth-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { AppStripeProvider } from '@/providers/stripe-provider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [error, loaded]);

  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;

  const application = (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
            <Stack.Screen name="reservations/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="fitness-assessment" options={{ presentation: 'modal' }} />
            <Stack.Screen name="journey" />
            <Stack.Screen name="journey/[id]" />
            <Stack.Screen
              name="reservations/[id]/edit"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="coach/create-annonce" options={{ presentation: 'modal' }} />
            <Stack.Screen name="coach/create-visio" options={{ presentation: 'modal' }} />
            <Stack.Screen name="coach/documents" options={{ presentation: 'modal' }} />
            <Stack.Screen name="coach/stripe" options={{ presentation: 'modal' }} />
          </Stack>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );

  return <AppStripeProvider>{application}</AppStripeProvider>;
}
