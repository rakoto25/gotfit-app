import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Field, Screen, StateView, Tag, TopBar } from '@/components/ui';
import { createForumDiscussion, fetchForumChannels, fetchForumDiscussions, getAssetUrl } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

export default function ForumScreen() {
  const { token, user } = useAuth();
  const allowed = Boolean(token && hasRole(user, 'intervenant'));
  const [channel, setChannel] = useState('');
  const [query, setQuery] = useState('');
  const [composer, setComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channelId, setChannelId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const resource = useResource(async () => {
    if (!token || !allowed) return { channels: [], discussions: [] };
    const [channels, discussions] = await Promise.all([
      fetchForumChannels(token), fetchForumDiscussions(token, { channel, q: query.trim(), sort: 'recent' }),
    ]);
    return { channels, discussions };
  }, [token, allowed, channel, query]);

  async function publish() {
    if (!token || !title.trim() || !body.trim()) return Alert.alert('Discussion incomplète', 'Ajoutez un titre et votre message.');
    const selected = channelId || resource.data?.channels[0]?.id;
    if (!selected) return Alert.alert('Canal manquant', 'Aucun canal de forum n’est disponible.');
    setPosting(true);
    try {
      await createForumDiscussion(token, { channel_id: selected, title: title.trim(), body: body.trim() });
      setTitle(''); setBody(''); setComposer(false); resource.reload();
    } catch (error) {
      Alert.alert('Publication impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally { setPosting(false); }
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Forum des coachs" subtitle="Communauté privée des coachs validés" action={<Pressable style={styles.bell} onPress={() => router.push('/forum/notifications')}><Ionicons name="notifications-outline" size={21} color={colors.ink} /></Pressable>} />
      {!allowed ? <StateView empty="Le forum est réservé aux coachs validés." /> : (
        <>
          <View style={styles.hero}><Text style={styles.heroTitle}>Partagez. Progressez. Inspirez.</Text><Text style={styles.heroText}>Échangez entre professionnels Gotfit dans un espace modéré.</Text><Button variant="lime" icon={composer ? 'close' : 'add'} onPress={() => setComposer((value) => !value)}>{composer ? 'Fermer' : 'Nouvelle discussion'}</Button></View>
          {composer && <View style={styles.composer}>
            <Text style={styles.sectionTitle}>Créer une discussion</Text>
            <View style={styles.channels}>{resource.data?.channels.map((item) => <Pressable key={item.id} style={[styles.channel, channelId === item.id && styles.channelActive]} onPress={() => setChannelId(item.id)}><Text style={[styles.channelText, channelId === item.id && styles.channelTextActive]}>{item.name}</Text></Pressable>)}</View>
            <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Votre sujet" />
            <Field label="Message" value={body} onChangeText={setBody} multiline placeholder="Partagez votre question ou votre expérience…" />
            <Button loading={posting} variant="lime" icon="paper-plane-outline" onPress={publish}>Publier</Button>
          </View>}
          <Field label="Rechercher" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Un sujet, un mot-clé…" />
          <View style={styles.channels}><Pressable style={[styles.channel, !channel && styles.channelActive]} onPress={() => setChannel('')}><Text style={[styles.channelText, !channel && styles.channelTextActive]}>Tous</Text></Pressable>{resource.data?.channels.map((item) => <Pressable key={item.id} style={[styles.channel, channel === item.slug && styles.channelActive]} onPress={() => setChannel(item.slug)}><Text style={[styles.channelText, channel === item.slug && styles.channelTextActive]}>{item.name}</Text></Pressable>)}</View>
          {resource.loading || resource.error ? <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} /> : resource.data?.discussions.length ? <View style={styles.list}>{resource.data.discussions.map((item) => <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/forum/[id]', params: { id: item.id } })}>
            <View style={styles.author}><Avatar size={42} name={item.author?.display_name || item.author?.name} uri={getAssetUrl(item.author?.photo_url || item.author?.photo)} /><View style={styles.flex}><Text style={styles.authorName}>{item.author?.display_name || item.author?.name || 'Coach Gotfit'}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text></View>{item.channel && <Tag tone="lime">{item.channel.name}</Tag>}</View>
            <Text style={styles.title}>{item.title}</Text><Text numberOfLines={3} style={styles.body}>{item.body}</Text>
            <View style={styles.meta}><Text style={styles.metaText}>💬 {item.comments_count || 0}</Text><Text style={styles.metaText}>❤️ {item.reactions_count || 0}</Text><Text style={styles.metaText}>👁 {item.views_count || 0}</Text></View>
          </Pressable>)}</View> : <StateView empty="Aucune discussion dans ce canal." />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, bell: { width: 43, height: 43, borderRadius: 16, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md, marginVertical: spacing.lg }, heroTitle: { fontFamily: fonts.display, fontSize: 27, color: colors.white }, heroText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,.7)' },
  composer: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.line }, sectionTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.ink },
  channels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md }, channel: { borderRadius: radii.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, paddingVertical: 9 }, channelActive: { backgroundColor: colors.ink, borderColor: colors.ink }, channelText: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink }, channelTextActive: { color: colors.white },
  list: { gap: spacing.md }, card: { backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, ...shadow }, author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, authorName: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, date: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 }, title: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.ink, marginTop: spacing.md }, body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.text, marginTop: spacing.sm }, meta: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }, metaText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
});
