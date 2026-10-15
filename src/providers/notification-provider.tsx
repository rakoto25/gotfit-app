import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { type PropsWithChildren, useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

type NotificationsModule = typeof import('expo-notifications');

const isExpoGo = Constants.executionEnvironment === 'storeClient';

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;

  return import('expo-notifications');
}

function openNotification(data: Record<string, unknown> | undefined) {
  if (!data) return;

  const conversationId =
    data.conversation_id || data.conversationId || data.conversation;
  const reservationId =
    data.reservation_id || data.reservationId || data.reservation;
  const annonceId = data.annonce_id || data.annonceId || data.annonce;
  const packId = data.pack_id || data.packId || data.pack;

  if (conversationId) {
    router.push({
      pathname: '/conversation/[id]',
      params: { id: String(conversationId) },
    });
    return;
  }

  if (reservationId) {
    router.push({
      pathname: '/reservations/[id]',
      params: { id: String(reservationId) },
    });
    return;
  }

  if (annonceId) {
    router.push({ pathname: '/annonces/[id]', params: { id: String(annonceId) } });
    return;
  }

  if (packId || String(data.url || '').includes('/packs')) router.push('/packs');
}

async function getPushToken(Notifications: NotificationsModule) {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages Gotfit',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: '#D9B55B',
      sound: 'default',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  if (!projectId) return null;

  return (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();

  useEffect(() => {
    if (!token || isExpoGo) return;

    let active = true;

    loadNotifications()
      .then(async (Notifications) => {
        if (!Notifications || !active) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const pushToken = await getPushToken(Notifications);
        if (!pushToken) return;
        return registerPushToken(token, pushToken, Platform.OS);
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn(
            'Enregistrement des notifications indisponible :',
            error instanceof Error ? error.message : error
          );
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (isExpoGo) return;

    let active = true;
    let responseSubscription: { remove: () => void } | null = null;

    loadNotifications()
      .then((Notifications) => {
        if (!Notifications || !active) return;

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            openNotification(
              response.notification.request.content.data as
                | Record<string, unknown>
                | undefined
            );
          });

        return Notifications.getLastNotificationResponseAsync();
      })
      .then((response) => {
        if (!response || !active) return;
        openNotification(
          response.notification.request.content.data as
            | Record<string, unknown>
            | undefined
        );
      })
      .catch(() => undefined);

    return () => {
      active = false;
      responseSubscription?.remove();
    };
  }, []);

  return children;
}
