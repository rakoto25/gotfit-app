import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, StateView, TopBar } from '@/components/ui';
import { deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';
import type { AppNotification } from '@/types';

function destination(item: AppNotification) {
  const data = item.data || {};
  if (data.conversation_id) return `/conversation/${data.conversation_id}`;
  if (data.reservation_id) return `/reservations/${data.reservation_id}`;
  if (data.annonce_id) return `/annonces/${data.annonce_id}`;
  if (data.pack_id || data.url?.includes('/packs')) return '/packs';
  return data.url?.startsWith('/') ? data.url : null;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const resource = useResource(() => token ? fetchNotifications(token) : Promise.resolve({ notifications: [], unreadCount: 0 }), [token]);

  async function open(item: AppNotification) {
    if (!token) return;
    if (!item.read_at) await markNotificationRead(token, item.id).catch(() => undefined);
    const route = destination(item);
    await resource.reload();
    if (route) router.push(route as never);
  }

  async function remove(item: AppNotification) {
    if (!token) return;
    await deleteNotification(token, item.id);
    await resource.reload();
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Notifications" subtitle={`${resource.data?.unreadCount || 0} non lue(s)`} />
      {resource.loading || resource.error ? <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} /> : null}
      {!resource.loading && !resource.error && resource.data?.notifications.length ? (
        <>
          {resource.data.unreadCount > 0 && <Button variant="light" icon="checkmark-done" onPress={async () => { if (token) { await markAllNotificationsRead(token); await resource.reload(); } }}>Tout marquer comme lu</Button>}
          <View style={styles.list}>
            {resource.data.notifications.map((item) => (
              <Pressable key={item.id} onPress={() => open(item)} onLongPress={() => Alert.alert('Supprimer cette notification ?', undefined, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => remove(item) }])} style={[styles.card, !item.read_at && styles.unread]}>
                <View style={styles.icon}><Ionicons name={item.read_at ? 'notifications-outline' : 'notifications'} size={20} color={colors.ink} /></View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{item.data?.title || 'Notification Gotfit'}</Text>
                  {!!item.data?.body && <Text style={styles.body}>{item.data.body}</Text>}
                  <Text style={styles.date}>{formatDate(item.created_at, true)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </>
      ) : !resource.loading && !resource.error ? <StateView empty="Vous n’avez aucune notification pour le moment." /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, marginTop: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  unread: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 }, title: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.text, marginTop: 3 },
  date: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 5 },
});
