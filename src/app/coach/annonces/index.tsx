import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnnonceCard } from '@/components/cards';
import { AuthGate, Button, Screen, StateView, TopBar } from '@/components/ui';
import { deleteAnnonce, fetchMyAnnonces } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function MyAnnoncesScreen() {
  const { token, user } = useAuth();
  const allowed = Boolean(token && hasRole(user, 'intervenant'));
  const resource = useResource(() => token && allowed ? fetchMyAnnonces(token) : Promise.resolve([]), [token, allowed]);

  function remove(id: number) {
    if (!token) return;
    Alert.alert('Supprimer cette annonce ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteAnnonce(token, id);
            resource.reload();
          } catch (error) {
            Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
          }
        },
      },
    ]);
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Mes annonces" subtitle="Publier, modifier et suivre" />
      {!allowed ? <AuthGate message="Cet espace est réservé aux coachs." /> : (
        <>
          <Button variant="lime" icon="add" onPress={() => router.push('/coach/create-annonce')}>Nouvelle annonce</Button>
          {resource.loading || resource.error ? (
            <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
          ) : resource.data?.length ? (
            <View style={styles.list}>
              {resource.data.map((item) => (
                <View key={item.id} style={styles.item}>
                  <AnnonceCard item={item} onPress={() => router.push({ pathname: '/annonces/[id]', params: { id: item.id } })} />
                  <View style={styles.actions}>
                    <Pressable style={styles.action} onPress={() => router.push({ pathname: '/coach/annonces/[id]/edit', params: { id: item.id } })}>
                      <Ionicons name="create-outline" size={17} color={colors.ink} />
                      <Text style={styles.actionText}>Modifier</Text>
                    </Pressable>
                    <Pressable style={[styles.action, styles.delete]} onPress={() => remove(item.id)}>
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      <Text style={[styles.actionText, styles.deleteText]}>Supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : <StateView empty="Vous n’avez pas encore publié d’annonce." />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.lg, gap: spacing.lg },
  item: { borderRadius: radii.lg, backgroundColor: colors.paper, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingTop: 0 },
  action: { flex: 1, minHeight: 43, borderRadius: radii.md, backgroundColor: colors.canvas, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  delete: { backgroundColor: '#FFF2F1' },
  deleteText: { color: colors.danger },
});
