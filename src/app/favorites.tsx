import { router } from 'expo-router';
import { View } from 'react-native';

import { AnnonceCard } from '@/components/cards';
import { AuthGate, Screen, StateView, TopBar } from '@/components/ui';
import { fetchFavorites } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme';

export default function FavoritesScreen() {
  const { token } = useAuth();
  const resource = useResource(
    () => (token ? fetchFavorites(token) : Promise.resolve([])),
    [token]
  );

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Mes favoris" subtitle="Vos inspirations, réunies ici" />
      {!token ? (
        <AuthGate />
      ) : resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : resource.data?.some((item) => item.annonce) ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          {resource.data
            .filter((item) => item.annonce)
            .map((favorite) => (
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
        </View>
      ) : (
        <StateView empty="Touchez le cœur d’une expérience pour la retrouver ici." />
      )}
    </Screen>
  );
}
