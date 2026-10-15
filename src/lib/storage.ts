import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'gotfit.mobile.session';

export async function readStoredSession() {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(SESSION_KEY) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function writeStoredSession(value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) {
      globalThis.localStorage?.removeItem(SESSION_KEY);
    } else {
      globalThis.localStorage?.setItem(SESSION_KEY, value);
    }
    return;
  }

  if (value === null) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}
