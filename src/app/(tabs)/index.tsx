import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnnonceCard, CoachCard, VisioCard } from '@/components/cards';
import { Avatar, Button, Eyebrow, SectionHeader, Screen, StateView, TopBar } from '@/components/ui';
import { fetchAnnonces, fetchCoaches, fetchVisioSessions, getAssetUrl } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, heroPhotos, radii, shadow, spacing } from '@/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const resource = useResource(
    async () => {
      const [annonces, coaches, visios] = await Promise.all([
        fetchAnnonces(),
        fetchCoaches(),
        fetchVisioSessions(),
      ]);
      return { annonces, coaches, visios };
    },
    []
  );
  const data = resource.data || { annonces: [], coaches: [], visios: [] };

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar
        subtitle={user ? `Bonjour, ${user.name.split(' ')[0]}` : 'Bougez. Progressez. Rayonnez.'}
        action={
          <Pressable onPress={() => router.push(user ? '/(tabs)/profile' : '/auth/login')}>
            <Avatar
              name={user?.name || 'Invité'}
              uri={getAssetUrl(user?.photo_url || user?.photo)}
              size={43}
            />
          </Pressable>
        }
      />

      <View style={styles.hero}>
        <Image source={{ uri: heroPhotos.home }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(11,25,17,.08)', 'rgba(12,28,18,.93)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroBadge}>
          <View style={styles.pulse} />
          <Text style={styles.heroBadgeText}>Votre meilleure version commence ici</Text>
        </View>
        <View style={styles.heroContent}>
          <Eyebrow inverse>Gotfit lifestyle</Eyebrow>
          <Text style={styles.heroTitle}>Un coach.{'\n'}Un rythme.{'\n'}Votre victoire.</Text>
          <Text style={styles.heroText}>
            Des séances humaines et personnalisées, partout où la vie vous emmène.
          </Text>
          <View style={styles.heroActions}>
            <Button
              full={false}
              variant="lime"
              icon="compass-outline"
              onPress={() => router.push('/(tabs)/explore')}>
              Explorer
            </Button>
            <Pressable style={styles.play} onPress={() => router.push('/(tabs)/explore')}>
              <Ionicons name="play" size={17} color={colors.ink} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        {[
          ['4.9', 'Note moyenne'],
          ['60+', 'Coachs experts'],
          ['24/7', 'À votre rythme'],
        ].map(([value, label], index) => (
          <View key={label} style={[styles.stat, index < 2 && styles.statLine]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <SectionHeader
            title="À vivre maintenant"
            subtitle="Des expériences choisies pour vous"
            action={{ label: 'Tout voir', onPress: () => router.push('/(tabs)/explore') }}
          />
          {data.annonces.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontal}>
              {data.annonces.slice(0, 6).map((item) => (
                <AnnonceCard
                  key={item.id}
                  item={item}
                  compact
                  onPress={() =>
                    router.push({ pathname: '/annonces/[id]', params: { id: item.id } })
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <StateView empty="Les prochaines annonces arrivent bientôt." />
          )}

          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="sparkles" size={23} color={colors.ink} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Votre programme, vraiment à vous.</Text>
              <Text style={styles.bannerBody}>
                Définissez vos objectifs et laissez Gotfit affiner chaque recommandation.
              </Text>
            </View>
            <Pressable onPress={() => router.push(user ? '/onboarding' : '/auth/register')}>
              <Ionicons name="arrow-forward-circle" size={35} color={colors.ink} />
            </Pressable>
          </View>

          <SectionHeader
            title="Des coachs qui vous voient"
            subtitle="L’expertise avec une vraie dimension humaine"
          />
          {data.coaches.slice(0, 4).map((coach) => (
            <CoachCard
              key={coach.id}
              item={coach}
              onPress={() =>
                router.push({ pathname: '/coaches/[id]', params: { id: coach.id } })
              }
            />
          ))}

          <SectionHeader
            title="En live, ensemble"
            subtitle="Rejoignez une séance visio"
            action={{ label: 'Explorer', onPress: () => router.push('/(tabs)/explore') }}
          />
          {data.visios.slice(0, 4).map((session) => (
            <VisioCard
              key={session.id}
              item={session}
              onPress={() =>
                router.push({ pathname: '/visio/[id]', params: { id: session.id } })
              }
            />
          ))}
        </>
      )}

      {user && hasRole(user, 'intervenant') && (
        <Pressable style={styles.coachCta} onPress={() => router.push('/coach/dashboard')}>
          <View>
            <Text style={styles.coachCtaLabel}>Mode coach</Text>
            <Text style={styles.coachCtaTitle}>Piloter mon activité</Text>
          </View>
          <Ionicons name="stats-chart" size={25} color={colors.lime} />
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 530,
    borderRadius: 38,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    ...shadow,
  },
  heroBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroBadgeText: { fontFamily: fonts.bold, fontSize: 9, color: colors.ink },
  heroContent: { marginTop: 'auto', padding: spacing.xl, paddingBottom: spacing.xxl },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 44,
    color: colors.white,
    marginTop: spacing.md,
  },
  heroText: {
    maxWidth: 295,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,.76)',
    marginTop: spacing.md,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  play: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statLine: { borderRightWidth: 1, borderRightColor: colors.line },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted },
  horizontal: { paddingRight: spacing.lg },
  banner: {
    marginTop: spacing.xxl,
    backgroundColor: colors.lime,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.55)',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink },
  bannerBody: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: colors.inkSoft, marginTop: 3 },
  coachCta: {
    marginTop: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachCtaLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.lime, textTransform: 'uppercase' },
  coachCtaTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.white, marginTop: 3 },
});
