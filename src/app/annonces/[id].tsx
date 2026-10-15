import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, IconButton, Screen, StateView, Tag } from '@/components/ui';
import {
  addFavorite,
  fetchAnnonce,
  fetchFavorites,
  getAssetUrl,
  removeFavorite,
} from '@/lib/api';
import { annonceDescription, annonceTitle, formatMoney } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, heroPhotos, radii, shadow, spacing } from '@/theme';

export default function AnnonceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const resource = useResource(() => fetchAnnonce(id), [id]);
  const item = resource.data;

  useEffect(() => {
    if (!token || !id) return;
    fetchFavorites(token)
      .then((items) =>
        setFavorite(items.some((entry) => String(entry.annonce_id || entry.annonce?.id) === String(id)))
      )
      .catch(() => undefined);
  }, [id, token]);

  async function toggleFavorite() {
    if (!token) return router.push('/auth/login');
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (favorite) await removeFavorite(token, id);
      else await addFavorite(token, id);
      setFavorite(!favorite);
    } catch (error) {
      Alert.alert('Favoris', error instanceof Error ? error.message : 'Impossible de modifier ce favori.');
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Retour" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Expérience</Text>
        <IconButton
          icon={favorite ? 'heart' : 'heart-outline'}
          label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          tone={favorite ? 'lime' : 'light'}
          disabled={favoriteBusy}
          onPress={toggleFavorite}
        />
      </View>
      {resource.loading || resource.error || !item ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <View style={styles.hero}>
            <Image
              source={{ uri: getAssetUrl(item.image_url || item.image) || heroPhotos.wellness }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(12,26,17,.82)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroTop}>
              <Tag tone="lime">{item.category || 'Coaching'}</Tag>
              <Tag tone="dark">{formatMoney(item.price)}</Tag>
            </View>
            <Text style={styles.heroTitle}>{annonceTitle(item)}</Text>
          </View>
          <View style={styles.coach}>
            <Avatar name={item.user?.name || item.intervenant?.name} uri={getAssetUrl(item.user?.photo_url || item.user?.photo)} size={58} />
            <View style={styles.flex}>
              <Text style={styles.coachLabel}>Votre coach</Text>
              <Text style={styles.coachName}>{item.user?.name || item.intervenant?.name || 'Coach Gotfit'}</Text>
            </View>
            {Boolean(item.user?.id || item.intervenant?.id) && (
              <Pressable
                style={styles.arrow}
                onPress={() =>
                  router.push({
                    pathname: '/coaches/[id]',
                    params: { id: item.user?.id || item.intervenant?.id || '' },
                  })
                }>
                <Ionicons name="arrow-forward" size={18} color={colors.ink} />
              </Pressable>
            )}
          </View>
          <Text style={styles.section}>À propos de cette expérience</Text>
          <Text style={styles.description}>{annonceDescription(item)}</Text>
          <View style={styles.details}>
            <Detail icon="time-outline" label="Durée" value={`${item.duration || 60} min`} />
            <Detail icon="videocam-outline" label="Format" value={item.is_online ? 'En ligne' : 'En présentiel'} />
            <Detail icon="location-outline" label="Lieu" value={item.city || item.location || 'À convenir'} />
          </View>
          <View style={styles.cta}>
            <View>
              <Text style={styles.ctaLabel}>À partir de</Text>
              <Text style={styles.ctaPrice}>{formatMoney(item.price)}</Text>
            </View>
            <Button
              full={false}
              variant="lime"
              onPress={() =>
                router.push(
                  token
                    ? { pathname: '/reservations/new', params: { annonceId: item.id } }
                    : { pathname: '/auth/login', params: { redirect: `/reservations/new?annonceId=${item.id}` } }
                )
              }>
              Réserver
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

function Detail({ icon, label, value }: { icon: 'time-outline' | 'videocam-outline' | 'location-outline'; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={20} color={colors.ink} /></View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink },
  hero: { height: 420, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.ink, ...shadow },
  heroTop: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  heroTitle: { marginTop: 'auto', padding: spacing.xl, fontFamily: fonts.display, fontSize: 36, lineHeight: 39, color: colors.white },
  coach: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  coachLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  coachName: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink, marginTop: 2 },
  arrow: { width: 41, height: 41, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  section: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 22, color: colors.muted },
  details: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  detail: { flex: 1, backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  detailIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted, marginTop: 7 },
  detailValue: { fontFamily: fonts.bold, fontSize: 9, color: colors.ink, marginTop: 2 },
  cta: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.ink, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctaLabel: { fontFamily: fonts.regular, fontSize: 9, color: 'rgba(255,255,255,.65)' },
  ctaPrice: { fontFamily: fonts.display, fontSize: 25, color: colors.white, marginTop: 2 },
});
