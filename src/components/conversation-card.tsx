import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { getAssetUrl } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { colors, fonts, radii, spacing } from '@/theme';
import type { Conversation, User } from '@/types';

export function PremiumConversationCard({
  item,
  currentUser,
  onPress,
}: {
  item: Conversation;
  currentUser?: User | null;
  onPress: () => void;
}) {
  const person =
    Number(currentUser?.id) === Number(item.client_id)
      ? item.intervenant
      : item.client;
  const last = item.messages?.[item.messages.length - 1];
  const unread = Number(item.unread_count || 0);
  const hasMedia = Boolean(last?.media_full_url || last?.media_url);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la conversation avec ${
        person?.name || 'Gotfit'
      }`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        unread > 0 && styles.cardUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar
          name={person?.name}
          uri={getAssetUrl(person?.photo_url || person?.photo)}
          size={56}
        />
        <View style={styles.presence} />
      </View>

      <View style={styles.content}>
        <View style={styles.top}>
          <Text numberOfLines={1} style={styles.name}>
            {person?.name || 'Conversation Gotfit'}
          </Text>
          <Text style={styles.date}>
            {last?.created_at
              ? formatDate(last.created_at)
              : item.updated_at
                ? formatDate(item.updated_at)
                : ''}
          </Text>
        </View>

        <View style={styles.preview}>
          {hasMedia && (
            <Ionicons
              name="image-outline"
              size={14}
              color={unread ? colors.brand : colors.muted}
            />
          )}
          <Text
            numberOfLines={1}
            style={[
              styles.message,
              unread > 0 && styles.messageUnread,
            ]}
          >
            {last?.message ||
              (hasMedia ? 'Photo' : 'Commencez la conversation…')}
          </Text>
        </View>
      </View>

      {unread > 0 ? (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : (
        <View style={styles.arrow}>
          <Ionicons
            name="chevron-forward"
            size={17}
            color={colors.brand}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: 3,
    backgroundColor: colors.surface,
  },
  cardUnread: {
    backgroundColor: '#F7FAF8',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.992 }],
  },
  avatarWrap: {
    position: 'relative',
  },
  presence: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.success,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.ink,
  },
  date: {
    fontFamily: fonts.medium,
    fontSize: 8,
    color: colors.muted,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  message: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  messageUnread: {
    fontFamily: fonts.semibold,
    color: colors.inkSoft,
  },
  unread: {
    minWidth: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: colors.brand,
  },
  unreadText: {
    fontFamily: fonts.extraBold,
    fontSize: 9,
    color: colors.white,
  },
  arrow: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.brandSoft,
  },
});
