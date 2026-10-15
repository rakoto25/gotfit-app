import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Field, Screen, StateView, Tag, TopBar } from '@/components/ui';
import { createForumComment, deleteForumComment, deleteForumDiscussion, fetchForumDiscussion, getAssetUrl, reactToForumTarget, reportForumTarget } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import type { ForumComment, ForumReaction } from '@/types';
import { colors, fonts, radii, spacing } from '@/theme';

const reactions: { type: ForumReaction; icon: string }[] = [
  { type: 'like', icon: '👍' }, { type: 'love', icon: '❤️' }, { type: 'helpful', icon: '💡' }, { type: 'celebrate', icon: '🎉' },
];

export default function ForumDiscussionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ForumComment | null>(null);
  const [posting, setPosting] = useState(false);
  const resource = useResource(() => token ? fetchForumDiscussion(token, id) : Promise.reject(new Error('Connectez-vous pour accéder au forum.')), [token, id]);

  async function send() {
    if (!token || !resource.data || !message.trim()) return;
    setPosting(true);
    try {
      await createForumComment(token, resource.data.discussion.id, message.trim(), replyTo?.id);
      setMessage(''); setReplyTo(null); resource.reload();
    } catch (error) { Alert.alert('Réponse impossible', error instanceof Error ? error.message : 'Veuillez réessayer.'); }
    finally { setPosting(false); }
  }

  async function react(target: 'discussions' | 'comments', targetId: number, type: ForumReaction) {
    if (!token) return;
    try { await reactToForumTarget(token, target, targetId, type); resource.reload(); }
    catch (error) { Alert.alert('Réaction impossible', error instanceof Error ? error.message : 'Veuillez réessayer.'); }
  }

  function report(target: 'discussions' | 'comments', targetId: number) {
    if (!token) return;
    Alert.alert('Signaler ce contenu ?', 'La modération Gotfit examinera ce signalement.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Signaler', style: 'destructive', onPress: async () => { await reportForumTarget(token, target, targetId).catch((error) => Alert.alert('Signalement impossible', error instanceof Error ? error.message : 'Veuillez réessayer.')); } },
    ]);
  }

  function removeDiscussion() {
    if (!token || !resource.data) return;
    Alert.alert('Supprimer la discussion ?', 'Cette action est définitive.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteForumDiscussion(token, resource.data!.discussion.id); router.replace('/forum'); } }]);
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Discussion" subtitle="Forum des coachs" />
      {resource.loading || resource.error || !resource.data ? <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} /> : <>
        <View style={styles.discussion}>
          <View style={styles.author}><Avatar size={48} name={resource.data.discussion.author?.display_name || resource.data.discussion.author?.name} uri={getAssetUrl(resource.data.discussion.author?.photo_url || resource.data.discussion.author?.photo)} /><View style={styles.flex}><Text style={styles.authorName}>{resource.data.discussion.author?.display_name || resource.data.discussion.author?.name || 'Coach Gotfit'}</Text><Text style={styles.date}>{new Date(resource.data.discussion.created_at).toLocaleString('fr-FR')}</Text></View>{resource.data.discussion.channel && <Tag tone="lime">{resource.data.discussion.channel.name}</Tag>}</View>
          <Text style={styles.title}>{resource.data.discussion.title}</Text><Text style={styles.body}>{resource.data.discussion.body}</Text>
          <ReactionBar counts={resource.data.discussion.reaction_counts} selected={resource.data.discussion.viewer_reaction} onReact={(type) => react('discussions', resource.data!.discussion.id, type)} />
          <View style={styles.actions}><Pressable onPress={() => report('discussions', resource.data!.discussion.id)}><Text style={styles.link}>Signaler</Text></Pressable>{resource.data.discussion.can_edit && <Pressable onPress={removeDiscussion}><Text style={styles.delete}>Supprimer</Text></Pressable>}</View>
        </View>
        <Text style={styles.heading}>{resource.data.comments.length} réponse{resource.data.comments.length > 1 ? 's' : ''}</Text>
        <View style={styles.comments}>{resource.data.comments.map((comment) => <CommentCard key={comment.id} comment={comment} userId={user?.id} onReply={setReplyTo} onReact={(commentId, type) => react('comments', commentId, type)} onReport={(commentId) => report('comments', commentId)} onDelete={async (commentId) => { if (!token) return; await deleteForumComment(token, commentId); resource.reload(); }} />)}</View>
        <View style={styles.composer}>{replyTo && <View style={styles.replying}><Text style={styles.replyingText}>Réponse à {replyTo.author?.display_name || replyTo.author?.name || 'ce coach'}</Text><Pressable onPress={() => setReplyTo(null)}><Ionicons name="close" size={18} color={colors.ink} /></Pressable></View>}<Field label="Votre réponse" value={message} onChangeText={setMessage} multiline placeholder="Apportez votre expérience…" /><Button loading={posting} variant="lime" icon="send-outline" onPress={send}>Publier la réponse</Button></View>
      </>}
    </Screen>
  );
}

function ReactionBar({ counts, selected, onReact }: { counts?: Partial<Record<ForumReaction, number>>; selected?: ForumReaction | null; onReact: (type: ForumReaction) => void }) {
  return <View style={styles.reactions}>{reactions.map(({ type, icon }) => <Pressable key={type} style={[styles.reaction, selected === type && styles.reactionActive]} onPress={() => onReact(type)}><Text style={styles.reactionText}>{icon} {counts?.[type] || 0}</Text></Pressable>)}</View>;
}

function CommentCard({ comment, userId, onReply, onReact, onReport, onDelete, depth = 0 }: { comment: ForumComment; userId?: number; onReply: (comment: ForumComment) => void; onReact: (id: number, type: ForumReaction) => void; onReport: (id: number) => void; onDelete: (id: number) => void; depth?: number }) {
  return <View style={[styles.comment, depth > 0 && styles.child]}><View style={styles.author}><Avatar size={38} name={comment.author?.display_name || comment.author?.name} uri={getAssetUrl(comment.author?.photo_url || comment.author?.photo)} /><View style={styles.flex}><Text style={styles.authorName}>{comment.author?.display_name || comment.author?.name || 'Coach Gotfit'}</Text><Text style={styles.date}>{new Date(comment.created_at).toLocaleString('fr-FR')}</Text></View></View><Text style={styles.commentBody}>{comment.body}</Text><ReactionBar counts={comment.reaction_counts} selected={comment.viewer_reaction} onReact={(type) => onReact(comment.id, type)} /><View style={styles.actions}><Pressable onPress={() => onReply(comment)}><Text style={styles.link}>Répondre</Text></Pressable><Pressable onPress={() => onReport(comment.id)}><Text style={styles.link}>Signaler</Text></Pressable>{(comment.can_edit || comment.author_id === userId) && <Pressable onPress={() => onDelete(comment.id)}><Text style={styles.delete}>Supprimer</Text></Pressable>}</View>{comment.children?.map((child) => <CommentCard key={child.id} comment={child} userId={userId} onReply={onReply} onReact={onReact} onReport={onReport} onDelete={onDelete} depth={depth + 1} />)}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, discussion: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, marginTop: spacing.lg }, author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, authorName: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, date: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted }, title: { fontFamily: fonts.display, fontSize: 25, color: colors.ink, marginTop: spacing.lg }, body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.text, marginTop: spacing.md },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }, reaction: { borderRadius: radii.pill, backgroundColor: colors.canvas, paddingHorizontal: 10, paddingVertical: 7 }, reactionActive: { backgroundColor: colors.brandSoft }, reactionText: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink }, actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }, link: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted }, delete: { fontFamily: fonts.bold, fontSize: 10, color: colors.danger },
  heading: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.ink, marginVertical: spacing.lg }, comments: { gap: spacing.md }, comment: { backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line }, child: { marginTop: spacing.md, marginLeft: spacing.md, backgroundColor: colors.canvas }, commentBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.text, marginTop: spacing.md },
  composer: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.line }, replying: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.brandSoft, borderRadius: radii.md, padding: spacing.sm }, replyingText: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink },
});
