import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Screen, StateView, Tag, TopBar } from '@/components/ui';
import { fetchVisioSessions, getAssetUrl, joinVisio, reserveVisio } from '@/lib/api';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

export default function VisioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [working, setWorking] = useState(false);
  const resource = useResource(async () => {
    const sessions = await fetchVisioSessions();
    const session = sessions.find((item) => String(item.id) === String(id));
    if (!session) throw new Error('Cette séance visio est introuvable.');
    return session;
  }, [id]);
  const session = resource.data;

  async function reserve() {
    if (!token) return router.push('/auth/login');
    setWorking(true);
    try {
      await reserveVisio(token, id);
      Alert.alert('Place réservée ✨', 'La séance apparaît maintenant dans votre planning.');
    } catch (error) {
      Alert.alert('Réservation impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function join() {
    if (!token) return router.push('/auth/login');
    setWorking(true);
    try {
      const payload = await joinVisio(token, id);
      const url = payload.join_url || payload.server_url;
      if (!url) throw new Error('Le lien de la salle n’est pas encore disponible.');
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Accès impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Séance visio" />
      {resource.loading || resource.error || !session ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <LinearGradient colors={[colors.lavender, colors.sage]} style={styles.hero}>
            <View style={styles.camera}><Ionicons name="videocam" size={42} color={colors.ink} /></View>
            <Tag tone={session.status === 'live' ? 'coral' : 'dark'}>{statusLabel(session.status)}</Tag>
            <Text style={styles.title}>{session.title}</Text>
            <Text style={styles.description}>{session.description || 'Une séance live, guidée et énergisante.'}</Text>
          </LinearGradient>

          <View style={styles.coach}>
            <Avatar name={session.coach?.name || session.intervenant?.name} uri={getAssetUrl(session.coach?.photo_url || session.coach?.photo)} size={53} />
            <View style={styles.flex}>
              <Text style={styles.coachLabel}>Animé par</Text>
              <Text style={styles.coachName}>{session.coach?.name || session.intervenant?.name || 'Coach Gotfit'}</Text>
            </View>
            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
          </View>

          <View style={styles.details}>
            <Detail icon="calendar-outline" label="Date" value={formatDate(session.start_at, true)} />
            <Detail icon="timer-outline" label="Durée" value={`${session.duration_minutes} min`} />
            <Detail icon="people-outline" label="Places" value={`${session.available_places ?? session.max_participants ?? '∞'}`} />
            <Detail icon="wallet-outline" label="Prix" value={formatMoney(session.price, session.currency || 'EUR')} />
          </View>

          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={23} color={colors.ink} />
            <Text style={styles.tipText}>Installez-vous dans un endroit calme et connectez-vous 5 minutes avant le début.</Text>
          </View>

          <Button
            loading={working}
            variant={session.status === 'live' ? 'lime' : 'dark'}
            icon={session.status === 'live' ? 'videocam' : 'ticket-outline'}
            onPress={session.status === 'live' ? join : reserve}>
            {session.status === 'live' ? 'Rejoindre maintenant' : 'Réserver ma place'}
          </Button>
        </>
      )}
    </Screen>
  );
}

function Detail({ icon, label, value }: { icon: 'calendar-outline' | 'timer-outline' | 'people-outline' | 'wallet-outline'; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', ...shadow },
  camera: { width: 82, height: 82, borderRadius: 30, backgroundColor: 'rgba(255,255,255,.66)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 31, lineHeight: 35, color: colors.ink, textAlign: 'center', marginTop: spacing.lg },
  description: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.sm },
  coach: { marginTop: spacing.lg, backgroundColor: colors.paper, padding: spacing.lg, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.line },
  coachLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  coachName: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink, marginTop: 2 },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.xl },
  detail: { width: '48%', flexGrow: 1, backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  detailLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted, marginTop: 8 },
  detailValue: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink, marginTop: 2 },
  tip: { backgroundColor: colors.lime, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  tipText: { flex: 1, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, color: colors.ink },
});
