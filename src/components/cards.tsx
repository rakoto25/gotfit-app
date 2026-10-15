import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Tag } from '@/components/ui';
import { getAssetUrl } from '@/lib/api';
import {
  annonceDescription,
  annonceTitle,
  coachDescription,
  coachName,
  coachTitle,
  formatDate,
  formatMoney,
  parseDate,
  reservationDate,
  statusLabel,
} from '@/lib/format';
import { colors, fonts, radii, shadow, spacing } from '@/theme';
import type { Annonce, Coach, Conversation, Reservation, User, VisioSession } from '@/types';

const fallbackPhoto =
  'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=82';

export function AnnonceCard({
  item,
  onPress,
  compact = false,
}: {
  item: Annonce;
  onPress: () => void;
  compact?: boolean;
}) {
  const photo = getAssetUrl(item.image_url || item.image) || fallbackPhoto;
  const coach = item.user || item.intervenant;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.annonce,
        compact && styles.annonceCompact,
        pressed && styles.pressed,
      ]}>
      <Image source={{ uri: photo }} style={styles.annonceImage} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(10,22,15,.86)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.annonceTop}>
        <Tag tone={item.is_boosted ? 'lime' : 'neutral'}>
          {item.is_boosted ? 'Sélection' : item.category || 'Coaching'}
        </Tag>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{formatMoney(item.price)}</Text>
        </View>
      </View>
      <View style={styles.annonceBottom}>
        <Text numberOfLines={1} style={styles.annonceTitle}>
          {annonceTitle(item)}
        </Text>
        <Text numberOfLines={2} style={styles.annonceDescription}>
          {annonceDescription(item)}
        </Text>
        <View style={styles.annonceMeta}>
          <Avatar
            name={coach?.name}
            uri={getAssetUrl(coach?.photo_url || coach?.photo)}
            size={28}
          />
          <Text numberOfLines={1} style={styles.annonceCoach}>
            {coach?.name || 'Coach Gotfit'}
          </Text>
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,.72)" />
          <Text numberOfLines={1} style={styles.annoncePlace}>
            {item.is_online ? 'En ligne' : item.city || item.location || 'À définir'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function CoachCard({ item, onPress }: { item: Coach; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.coachCard, pressed && styles.pressed]}>
      <View>
        <Avatar
          name={coachName(item)}
          uri={getAssetUrl(item.photo_url || item.photo)}
          size={74}
          ring
        />
        <View style={styles.onlineDot} />
      </View>
      <View style={styles.coachInfo}>
        <Text numberOfLines={1} style={styles.coachName}>
          {coachName(item)}
        </Text>
        <Text numberOfLines={1} style={styles.coachTitle}>
          {coachTitle(item)}
        </Text>
        <Text numberOfLines={2} style={styles.coachDescription}>
          {coachDescription(item)}
        </Text>
        <View style={styles.coachMeta}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.coachRating}>{Number(item.rating || 5).toFixed(1)}</Text>
          <View style={styles.dot} />
          <Text style={styles.coachReviews}>{item.reviews_count || 0} avis</Text>
        </View>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="arrow-forward" size={18} color={colors.ink} />
      </View>
    </Pressable>
  );
}

export function VisioCard({ item, onPress }: { item: VisioSession; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.visio, pressed && styles.pressed]}>
      <View style={styles.visioIcon}>
        <Ionicons name="videocam" size={23} color={colors.ink} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.visioTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.visioDate}>
          {formatDate(item.start_at, true)} · {item.duration_minutes} min
        </Text>
        <View style={styles.visioMeta}>
          <Text style={styles.visioCoach}>
            {item.coach?.name || item.intervenant?.name || 'Coach Gotfit'}
          </Text>
          <Text style={styles.visioPrice}>{formatMoney(item.price, item.currency || 'EUR')}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export function ReservationCard({
  item,
  onPress,
}: {
  item: Reservation;
  onPress?: () => void;
}) {
  const title = item.annonce ? annonceTitle(item.annonce) : item.title || 'Séance Gotfit';
  const date = parseDate(reservationDate(item));
  const day = date ? String(date.getDate()).padStart(2, '0') : '--';
  const month = date
    ? new Intl.DateTimeFormat('fr-FR', { month: 'short' })
        .format(date)
        .replace('.', '')
    : 'à venir';

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.reservation, pressed && styles.pressed]}>
      <View style={styles.dateBlock}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.reservationTitle}>
          {title}
        </Text>
        <Text style={styles.reservationTime}>{formatDate(reservationDate(item), true)}</Text>
        <View style={styles.reservationFooter}>
          <Tag tone={item.status === 'confirmed' || item.status === 'confirme' ? 'lime' : 'neutral'}>
            {statusLabel(item.status)}
          </Tag>
          <Text numberOfLines={1} style={styles.reservationCoach}>
            {item.intervenant?.name || item.annonce?.user?.name || 'Coach'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function ConversationCard({
  item,
  currentUser,
  onPress,
}: {
  item: Conversation;
  currentUser?: User | null;
  onPress: () => void;
}) {
  const person =
    Number(currentUser?.id) === Number(item.client_id) ? item.intervenant : item.client;
  const last = item.messages?.[item.messages.length - 1];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.conversation, pressed && styles.pressed]}>
      <Avatar
        name={person?.name}
        uri={getAssetUrl(person?.photo_url || person?.photo)}
        size={54}
      />
      <View style={styles.flex}>
        <View style={styles.conversationTop}>
          <Text numberOfLines={1} style={styles.conversationName}>
            {person?.name || 'Conversation Gotfit'}
          </Text>
          <Text style={styles.conversationDate}>
            {last?.created_at ? formatDate(last.created_at) : ''}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.conversationMessage}>
          {last?.message || 'Commencez la conversation…'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  annonce: {
    height: 350,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    ...shadow,
  },
  annonceCompact: { width: 292, height: 330, marginRight: spacing.lg },
  annonceImage: { ...StyleSheet.absoluteFill },
  annonceTop: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricePill: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  priceText: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  annonceBottom: {
    marginTop: 'auto',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  annonceTitle: { fontFamily: fonts.display, fontSize: 27, color: colors.white },
  annonceDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,.72)',
  },
  annonceMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm },
  annonceCoach: {
    maxWidth: 90,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.white,
  },
  annoncePlace: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,.72)',
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  onlineDot: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.white,
    right: 2,
    bottom: 2,
  },
  coachInfo: { flex: 1, gap: 3 },
  coachName: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.ink },
  coachTitle: { fontFamily: fonts.bold, fontSize: 11, color: colors.success },
  coachDescription: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.muted },
  coachMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  coachRating: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink },
  coachReviews: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  visioIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visioTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink },
  visioDate: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 3 },
  visioMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: 8 },
  visioCoach: { flex: 1, fontFamily: fonts.bold, fontSize: 10, color: colors.ink },
  visioPrice: { fontFamily: fonts.extraBold, fontSize: 10, color: colors.success },
  reservation: {
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dateBlock: {
    width: 56,
    height: 66,
    borderRadius: 19,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontFamily: fonts.display, fontSize: 23, color: colors.white },
  dateMonth: { fontFamily: fonts.bold, fontSize: 9, color: colors.lime, textTransform: 'uppercase' },
  reservationTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink },
  reservationTime: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 3 },
  reservationFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  reservationCoach: { flex: 1, fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
  conversation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  conversationTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  conversationName: { flex: 1, fontFamily: fonts.extraBold, fontSize: 14, color: colors.ink },
  conversationDate: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  conversationMessage: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 5 },
});
