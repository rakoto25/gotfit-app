import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumConversationCard } from '@/components/conversation-card';
import { AuthGate, Screen, StateView, TopBar } from '@/components/ui';
import { fetchConversations } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

export default function MessagesScreen() {
  const { token, user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const resource = useResource(
    () => (token ? fetchConversations(token) : Promise.resolve([])),
    [token]
  );

  const conversations = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('fr-FR');

    return (resource.data || []).filter((item) => {
      const person =
        Number(user?.id) === Number(item.client_id)
          ? item.intervenant
          : item.client;
      const last = item.messages?.[item.messages.length - 1];
      const matchesFilter =
        filter === 'all' || Number(item.unread_count || 0) > 0;
      const matchesSearch =
        !search ||
        person?.name?.toLocaleLowerCase('fr-FR').includes(search) ||
        last?.message?.toLocaleLowerCase('fr-FR').includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [filter, query, resource.data, user?.id]);

  const unreadCount = useMemo(
    () =>
      (resource.data || []).reduce(
        (total, item) => total + Number(item.unread_count || 0),
        0
      ),
    [resource.data]
  );

  if (!token) {
    return (
      <Screen>
        <TopBar
          title="Messages"
          subtitle="Toujours proche de votre coach"
        />
        <AuthGate message="Connectez-vous pour échanger avec vos coachs en toute simplicité." />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={resource.refreshing}
      onRefresh={resource.reload}
    >
      <TopBar
        title="Messages"
        subtitle="Vos échanges privés"
        action={
          <View style={styles.headerBadge}>
            <Ionicons
              name="shield-checkmark"
              size={15}
              color={colors.brand}
            />
          </View>
        }
      />

      <View style={styles.hero}>
        <View style={styles.heroOrb}>
          <Ionicons
            name="chatbubbles-outline"
            size={29}
            color={colors.white}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>ESPACE CONFIDENTIEL</Text>
          <Text style={styles.heroTitle}>
            Votre suivi, sans distance.
          </Text>
          <Text style={styles.heroText}>
            Échangez avec votre coach, partagez vos progrès et envoyez
            des photos en toute simplicité.
          </Text>
        </View>

        <View style={styles.heroMetric}>
          <Text style={styles.heroMetricValue}>
            {resource.data?.length || 0}
          </Text>
          <Text style={styles.heroMetricLabel}>conversations</Text>
        </View>
      </View>

      <View style={styles.tools}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une conversation"
            placeholderTextColor="#89938D"
            style={styles.searchInput}
            accessibilityLabel="Rechercher une conversation"
          />
          {query ? (
            <Pressable
              accessibilityLabel="Effacer la recherche"
              onPress={() => setQuery('')}
              style={styles.clearSearch}
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[
              styles.filter,
              filter === 'all' && styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' && styles.filterTextActive,
              ]}
            >
              Toutes
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('unread')}
            style={[
              styles.filter,
              filter === 'unread' && styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'unread' && styles.filterTextActive,
              ]}
            >
              Non lues
            </Text>
            {unreadCount > 0 && (
              <View
                style={[
                  styles.filterCount,
                  filter === 'unread' && styles.filterCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    filter === 'unread' &&
                      styles.filterCountTextActive,
                  ]}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>CONVERSATIONS</Text>
          <Text style={styles.sectionTitle}>
            {filter === 'unread' ? 'À consulter' : 'Messages récents'}
          </Text>
        </View>
        <View style={styles.secureLine}>
          <View style={styles.secureDot} />
          <Text style={styles.secureLabel}>Privé</Text>
        </View>
      </View>

      {resource.loading || resource.error ? (
        <StateView
          loading={resource.loading}
          error={resource.error}
          onRetry={resource.reload}
        />
      ) : conversations.length ? (
        <View style={styles.list}>
          {conversations.map((item) => (
            <PremiumConversationCard
              key={item.id}
              item={item}
              currentUser={user}
              onPress={() =>
                router.push({
                  pathname: '/conversation/[id]',
                  params: { id: item.id },
                })
              }
            />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={query ? 'search-outline' : 'mail-open-outline'}
              size={29}
              color={colors.brand}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {query
              ? 'Aucune conversation trouvée'
              : filter === 'unread'
                ? 'Tout est à jour'
                : 'Vos échanges commenceront ici'}
          </Text>
          <Text style={styles.emptyText}>
            {query
              ? 'Essayez un autre nom ou un autre mot.'
              : filter === 'unread'
                ? "Vous n'avez aucun message non lu."
                : 'Contactez un coach depuis son profil pour démarrer une conversation.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 210,
    marginTop: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: colors.ink,
    ...shadow,
  },
  heroOrb: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.18)',
    backgroundColor: colors.brand,
  },
  heroCopy: {
    maxWidth: 315,
    marginTop: spacing.lg,
  },
  heroEyebrow: {
    fontFamily: fonts.extraBold,
    fontSize: 9,
    color: colors.sage,
    letterSpacing: 1.6,
  },
  heroTitle: {
    marginTop: 7,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    color: colors.white,
  },
  heroText: {
    marginTop: 9,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: 'rgba(255,255,255,.68)',
  },
  heroMetric: {
    position: 'absolute',
    top: 24,
    right: 22,
    alignItems: 'flex-end',
  },
  heroMetricValue: {
    fontFamily: fonts.display,
    fontSize: 33,
    color: colors.white,
  },
  heroMetricLabel: {
    marginTop: -3,
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.sage,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tools: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  search: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
  },
  clearSearch: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filter: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
  },
  filterActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  filterText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
  },
  filterTextActive: {
    color: colors.white,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.brandSoft,
  },
  filterCountActive: {
    backgroundColor: colors.white,
  },
  filterCountText: {
    fontFamily: fonts.extraBold,
    fontSize: 8,
    color: colors.brandStrong,
  },
  filterCountTextActive: {
    color: colors.brandStrong,
  },
  sectionHeading: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionEyebrow: {
    fontFamily: fonts.extraBold,
    fontSize: 8,
    color: colors.brand,
    letterSpacing: 1.4,
  },
  sectionTitle: {
    marginTop: 4,
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  secureLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 3,
  },
  secureDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  secureLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  list: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  empty: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyText: {
    maxWidth: 290,
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
