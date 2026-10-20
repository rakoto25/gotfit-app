import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnnonceCard, CoachCard } from '@/components/cards';
import { AuthGate, Screen, StateView, TopBar } from '@/components/ui';
import { fetchCoachFavorites, fetchFavorites } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, spacing } from '@/theme';

export default function FavoritesScreen() {
  const { token } = useAuth();
  const resource = useResource(
    async () => {
      if (!token) return { annonces: [], coaches: [] };
      const [annonces, coaches] = await Promise.all([
        fetchFavorites(token),
        fetchCoachFavorites(token),
      ]);
      return { annonces, coaches };
    },
    [token]
  );
  const annonces = resource.data?.annonces.filter((item) => item.annonce) || [];
  const coaches = resource.data?.coaches.filter((item) => item.coach) || [];

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Mes favoris" subtitle="Vos inspirations, réunies ici" />
      {!token ? (
        <AuthGate />
      ) : resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : annonces.length || coaches.length ? (
        <View style={styles.content}>
          {coaches.length ? (
            <>
              <Text style={styles.heading}>Mes coachs favoris</Text>
              {coaches.map((favorite) => (
                <CoachCard
                  key={favorite.id}
                  item={favorite.coach!}
                  onPress={() =>
                    router.push({
                      pathname: '/coaches/[id]',
                      params: { id: favorite.coach!.id },
                    })
                  }
                />
              ))}
            </>
          ) : null}
          {annonces.length ? (
            <>
              <Text style={styles.heading}>Mes expériences favorites</Text>
              {annonces.map((favorite) => (
              <AnnonceCard
                key={favorite.id}
                item={favorite.annonce!}
                onPress={() =>
                  router.push({
                    pathname: '/annonces/[id]',
                    params: { id: favorite.annonce!.id },
                  })
                }
              />
              ))}
            </>
          ) : null}
        </View>
      ) : (
        <StateView empty="Touchez le cœur d’un coach ou d’une expérience pour le retrouver ici." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, marginTop: spacing.lg },
  heading: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.ink, marginTop: spacing.md },
});
