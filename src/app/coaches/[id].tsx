import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Screen, StateView, Tag, TopBar } from '@/components/ui';
import {
  addCoachFavorite,
  fetchCoach,
  fetchCoachFavorites,
  fetchCoachReviews,
  getAssetUrl,
  removeCoachFavorite,
  startConversation,
} from '@/lib/api';
import {
  coachDescription,
  coachName,
  coachTitle,
  formatDate,
  hasRole,
} from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

export default function CoachDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [messaging, setMessaging] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const resource = useResource(() => fetchCoach(id), [id]);
  const reviews = useResource(() => fetchCoachReviews(id), [id]);
  const favorites = useResource(
    () => (token && hasRole(user, 'client') ? fetchCoachFavorites(token) : Promise.resolve([])),
    [token, user?.id]
  );
  const coach = resource.data;
  const favorite = Boolean(
    favorites.data?.some((item) => String(item.coach_id) === String(id))
  );
  const reviewItems = reviews.data || [];
  const reviewsCount = reviewItems.length || Number(coach?.reviews_count || 0) || 0;
  const averageRating = reviewItems.length
    ? reviewItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
      reviewItems.length
    : Number(coach?.rating || 5) || 5;

  async function writeToCoach() {
    if (!token) return router.push('/auth/login');
    setMessaging(true);
    try {
      const conversation = await startConversation(token, id);
      router.push({
        pathname: '/conversation/[id]',
        params: { id: conversation.id },
      });
    } catch (error) {
      Alert.alert(
        'Conversation impossible',
        error instanceof Error ? error.message : 'Veuillez réessayer.'
      );
    } finally {
      setMessaging(false);
    }
  }

  async function toggleFavorite() {
    if (!token) return router.push('/auth/login');
    if (!hasRole(user, 'client')) return;

    setSavingFavorite(true);
    try {
      if (favorite) await removeCoachFavorite(token, id);
      else await addCoachFavorite(token, id);
      await favorites.reload();
    } catch (error) {
      Alert.alert(
        'Favoris',
        error instanceof Error ? error.message : 'Impossible de modifier ce coach favori.'
      );
    } finally {
      setSavingFavorite(false);
    }
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Profil coach" />
      {resource.loading || resource.error || !coach ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <LinearGradient colors={[colors.ink, colors.brandStrong]} style={styles.hero}>
            <View style={styles.heroLights} />
            {(!user || hasRole(user, 'client')) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Retirer ce coach des favoris' : 'Ajouter ce coach aux favoris'}
                disabled={savingFavorite}
                onPress={toggleFavorite}
                style={styles.favoriteButton}>
                <Ionicons
                  name={favorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={favorite ? colors.coral : colors.white}
                />
              </Pressable>
            )}
            <Avatar
              name={coachName(coach)}
              uri={getAssetUrl(coach.photo_url || coach.photo)}
              size={112}
              ring
            />
            <Text style={styles.name}>{coachName(coach)}</Text>
            <Text style={styles.title}>{coachTitle(coach)}</Text>
            <View style={styles.tags}>
              <Tag tone="lime">{averageRating.toFixed(1)} etoiles</Tag>
              <Tag tone="dark">{reviewsCount} avis</Tag>
            </View>
          </LinearGradient>

          <View style={styles.stats}>
            <Stat icon="ribbon-outline" value={`${coach.coach_experience_years || 5}+`} label="Années" />
            <Stat icon="people-outline" value="120+" label="Membres" />
            <Stat icon="language-outline" value="FR" label="Langue" />
          </View>

          <Text style={styles.heading}>Une méthode pensée pour vous</Text>
          <Text style={styles.description}>{coachDescription(coach)}</Text>

          <Text style={styles.heading}>Spécialités</Text>
          <View style={styles.specialities}>
            {String(coach.coach_speciality || coach.speciality || coach.specialty || 'Coaching personnalisé, Bien-être, Mobilité')
              .split(',')
              .map((item) => (
                <Tag key={item.trim()} tone="neutral">{item.trim()}</Tag>
              ))}
          </View>

          <Text style={styles.heading}>Ce qu’en disent les membres</Text>
          {reviewItems.length ? (
            reviewItems.slice(0, 6).map((review) => (
              <View key={review.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <Avatar
                    name={review.client?.name}
                    uri={getAssetUrl(review.client?.photo_url || review.client?.photo)}
                    size={42}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.reviewName}>{review.client?.name || 'Membre Gotfit'}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                  <Text style={styles.reviewRating}>{review.rating} ★</Text>
                </View>
                <Text style={styles.reviewText}>
                  {review.comment || 'Une expérience Gotfit très appréciée.'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.description}>Les premiers avis apparaîtront ici.</Text>
          )}

          <View style={styles.cta}>
            <View style={styles.flex}>
              <Text style={styles.ctaTitle}>Faites connaissance</Text>
              <Text style={styles.ctaText}>Échangez avec {coach.name.split(' ')[0]} avant votre première séance.</Text>
            </View>
            <Button
              full={false}
              variant="lime"
              icon="chatbubble-outline"
              loading={messaging}
              onPress={writeToCoach}>
              Écrire
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: 'ribbon-outline' | 'people-outline' | 'language-outline'; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={19} color={colors.ink} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', overflow: 'hidden', ...shadow },
  heroLights: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(217,181,91,.12)', top: -90, right: -60 },
  favoriteButton: { position: 'absolute', right: spacing.lg, top: spacing.lg, zIndex: 2, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.display, fontSize: 32, color: colors.white, marginTop: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 11, color: colors.lime, marginTop: 4 },
  tags: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  statValue: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink, marginTop: 5 },
  statLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted },
  heading: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 22, color: colors.muted },
  specialities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  review: { backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewName: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink },
  reviewDate: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted, marginTop: 2 },
  reviewRating: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.warning },
  reviewText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: spacing.md },
  cta: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  ctaTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.white },
  ctaText: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: 'rgba(255,255,255,.65)', marginTop: 3 },
});
