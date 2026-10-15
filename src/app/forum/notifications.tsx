import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Screen, StateView, TopBar } from '@/components/ui';
import { fetchForumNotifications, getAssetUrl, markAllForumNotificationsRead, markForumNotificationRead } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function ForumNotificationsScreen() {
  const { token } = useAuth();
  const resource = useResource(() => token ? fetchForumNotifications(token) : Promise.reject(new Error('Connectez-vous pour voir vos notifications.')), [token]);
  async function open(id: number, url?: string | null) {
    if (!token) return;
    await markForumNotificationRead(token, id).catch(() => undefined);
    const discussionId = url?.match(/forum-coachs\/(\d+)/)?.[1] || url?.match(/forum\/discussions\/(\d+)/)?.[1];
    if (discussionId) router.push({ pathname: '/forum/[id]', params: { id: discussionId } }); else resource.reload();
  }
  return <Screen refreshing={resource.refreshing} onRefresh={resource.reload}><TopBar back title="Notifications" subtitle={`${resource.data?.unreadCount || 0} non lue(s)`} />{resource.loading || resource.error ? <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} /> : <>{Boolean(resource.data?.unreadCount) && <Button variant="light" icon="checkmark-done-outline" onPress={async () => { if (token) await markAllForumNotificationsRead(token); resource.reload(); }}>Tout marquer comme lu</Button>}<View style={styles.list}>{resource.data?.notifications.map((item) => <Pressable key={item.id} style={[styles.item, !item.read_at && styles.unread]} onPress={() => open(item.id, item.url)}><Avatar size={42} name={item.actor?.display_name || item.actor?.name} uri={getAssetUrl(item.actor?.photo_url || item.actor?.photo)} /><View style={styles.flex}><Text style={styles.title}>{item.title}</Text>{Boolean(item.body) && <Text style={styles.body}>{item.body}</Text>}<Text style={styles.date}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text></View>{!item.read_at && <Ionicons name="ellipse" size={10} color={colors.brandStrong} />}</Pressable>)}</View>{!resource.data?.notifications.length && <StateView empty="Aucune notification pour le moment." />}</>}</Screen>;
}

const styles = StyleSheet.create({ list: { gap: spacing.sm, marginTop: spacing.lg }, item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line }, unread: { backgroundColor: colors.brandSoft }, flex: { flex: 1 }, title: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink }, body: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.text, marginTop: 3 }, date: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted, marginTop: 5 } });
