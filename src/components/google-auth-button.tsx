import Ionicons from '@expo/vector-icons/Ionicons';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

type GoogleRole = 'client' | 'intervenant';

function configured(value?: string) {
  const clean = String(value || '').trim();

  return Boolean(
    clean &&
      !clean.includes('google-client-id-not-configured') &&
      clean.endsWith('.apps.googleusercontent.com')
  );
}

function responseError(
  response: ReturnType<typeof Google.useIdTokenAuthRequest>[1]
) {
  if (!response || response.type !== 'error') {
    return 'Google n’a pas pu terminer la connexion.';
  }

  const description =
    response.params?.error_description ||
    response.params?.error ||
    response.error?.message;

  return description
    ? `Google a refusé la connexion : ${description}`
    : 'Google n’a pas pu terminer la connexion.';
}

export function GoogleAuthButton({
  role,
  label = 'Continuer avec Google',
  onSuccess,
}: {
  role: GoogleRole;
  label?: string;
  onSuccess: () => void;
}) {
  const { signInWithGoogle } = useAuth();
  const [working, setWorking] = useState(false);
  const handledResponse = useRef<string>('');

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  const platformClientId = Platform.select({
    web: webClientId,
    android: androidClientId,
    ios: iosClientId,
    default: webClientId,
  });

  const isExpoGo = Constants.appOwnership === 'expo';
  const hasPlatformClient = configured(platformClientId);

  const [request, response, promptAsync] =
    Google.useIdTokenAuthRequest({
      webClientId,
      androidClientId,
      iosClientId,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
    });

  const responseKey = useMemo(() => {
    if (!response) return '';

    const params =
      response.type === 'success' || response.type === 'error'
        ? response.params
        : {};

    return [
      response.type,
      params?.code || '',
      params?.id_token || '',
      params?.error || '',
    ].join(':');
  }, [response]);

  useEffect(() => {
    if (!response || !responseKey || handledResponse.current === responseKey) {
      return;
    }

    handledResponse.current = responseKey;
    const stopWorking = () => {
      requestAnimationFrame(() => setWorking(false));
    };

    if (response.type === 'cancel' || response.type === 'dismiss') {
      stopWorking();
      return;
    }

    if (response.type !== 'success') {
      stopWorking();
      Alert.alert('Connexion Google', responseError(response));
      return;
    }

    const credential =
      response.params.id_token ||
      response.authentication?.idToken ||
      '';

    if (!credential) {
      stopWorking();
      Alert.alert(
        'Jeton Google manquant',
        'Google a validé le compte, mais aucun jeton d’identité n’a été retourné. Vérifiez le type du client OAuth et recommencez.'
      );
      return;
    }

    signInWithGoogle(credential, role)
      .then(() => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => undefined);
        onSuccess();
      })
      .catch((error) => {
        Alert.alert(
          'Connexion impossible',
          error instanceof Error
            ? error.message
            : 'Le serveur Gotfit n’a pas accepté la connexion Google.'
        );
      })
      .finally(() => setWorking(false));
  }, [
    onSuccess,
    response,
    responseKey,
    role,
    signInWithGoogle,
  ]);

  function explainExpoGo() {
    Alert.alert(
      'Google nécessite une version de développement',
      'La connexion Google ne peut pas revenir correctement dans Expo Go. Ouvrez Gotfit avec un Development Build ou une version APK/AAB installée. Le formulaire classique reste disponible dans Expo Go.'
    );
  }

  function explainConfiguration() {
    const variable = Platform.select({
      android: 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
      ios: 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
      default: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    });

    Alert.alert(
      'Google n’est pas encore configuré',
      `Renseignez ${variable} avec un identifiant OAuth Google valide se terminant par .apps.googleusercontent.com, puis reconstruisez l’application.`
    );
  }

  async function startGoogleAuth() {
    if (working) return;

    if (Platform.OS !== 'web' && isExpoGo) {
      explainExpoGo();
      return;
    }

    if (!hasPlatformClient) {
      explainConfiguration();
      return;
    }

    if (!request) {
      Alert.alert(
        'Google se prépare',
        'La connexion Google n’est pas encore prête. Patientez un instant puis réessayez.'
      );
      return;
    }

    setWorking(true);
    handledResponse.current = '';

    try {
      const result = await promptAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        setWorking(false);
      }
    } catch (error) {
      setWorking(false);
      Alert.alert(
        'Impossible d’ouvrir Google',
        error instanceof Error
          ? error.message
          : 'La fenêtre de connexion n’a pas pu être ouverte.'
      );
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Ouvre la connexion sécurisée Google"
        disabled={working}
        onPress={startGoogleAuth}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          working && styles.disabled,
        ]}
      >
        <View style={styles.icon}>
          {working ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Ionicons name="logo-google" size={20} color={colors.brand} />
          )}
        </View>

        <Text style={styles.label}>
          {working ? 'Connexion sécurisée…' : label}
        </Text>

        <Ionicons
          name="arrow-forward"
          size={17}
          color={working ? colors.muted : colors.ink}
        />
      </Pressable>

      {Platform.OS !== 'web' && isExpoGo && (
        <Pressable
          accessibilityRole="button"
          onPress={explainExpoGo}
          style={styles.notice}
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={colors.warning}
          />
          <Text style={styles.noticeText}>
            Google fonctionne dans le Development Build, pas dans Expo Go.
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 9,
  },
  button: {
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingRight: 17,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.brandSoft,
  },
  label: {
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    color: colors.ink,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  noticeText: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 13,
    color: colors.warning,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.68,
  },
});
