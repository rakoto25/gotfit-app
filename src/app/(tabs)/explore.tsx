import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnnonceCard, CoachCard, VisioCard } from '@/components/cards';
import { Screen, StateView, TopBar } from '@/components/ui';
import { fetchAnnonces, fetchCoaches, fetchVisioSessions } from '@/lib/api';
import { annonceTitle, coachName, coachTitle } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { colors, fonts, radii, spacing } from '@/theme';

type Filter = 'annonces' | 'coachs' | 'visio';

export default function ExploreScreen() {
  const [filter, setFilter] = useState<Filter>('annonces');
  const [query, setQuery] = useState('');
  const resource = useResource(async () => {
    const [annonces, coaches, visios] = await Promise.all([
      fetchAnnonces(),
      fetchCoaches(),
      fetchVisioSessions(),
    ]);
    return { annonces, coaches, visios };
  }, []);
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const data = resource.data || { annonces: [], coaches: [], visios: [] };
    return {
      annonces: data.annonces.filter((item) =>
        `${annonceTitle(item)} ${item.category || ''} ${item.city || ''}`
          .toLowerCase()
          .includes(normalized)
      ),
      coachs: data.coaches.filter((item) =>
        `${coachName(item)} ${coachTitle(item)}`.toLowerCase().includes(normalized)
      ),
      visio: data.visios.filter((item) =>
        `${item.title} ${item.coach?.name || ''}`.toLowerCase().includes(normalized)
      ),
    };
  }, [normalized, resource.data]);

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar title="Explorer" subtitle="Trouvez ce qui vous fait avancer" />
      <Text style={styles.title}>Votre prochain{'\n'}déclic est ici.</Text>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Coach, objectif, ville…"
          placeholderTextColor="#8D9791"
          style={styles.input}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filters}>
        {[
          ['annonces', 'Expériences'],
          ['coachs', 'Coachs'],
          ['visio', 'Visio live'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key as Filter)}
            style={[styles.filter, filter === key && styles.filterActive]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : filter === 'annonces' ? (
        filtered.annonces.length ? (
          <View style={styles.list}>
            {filtered.annonces.map((item) => (
              <AnnonceCard
                key={item.id}
                item={item}
                onPress={() =>
                  router.push({ pathname: '/annonces/[id]', params: { id: item.id } })
                }
              />
            ))}
          </View>
        ) : (
          <StateView empty="Aucune expérience ne correspond à votre recherche." />
        )
      ) : filter === 'coachs' ? (
        filtered.coachs.length ? (
          <View style={styles.list}>
            {filtered.coachs.map((item) => (
              <CoachCard
                key={item.id}
                item={item}
                onPress={() =>
                  router.push({ pathname: '/coaches/[id]', params: { id: item.id } })
                }
              />
            ))}
          </View>
        ) : (
          <StateView empty="Aucun coach ne correspond à votre recherche." />
        )
      ) : filtered.visio.length ? (
        <View style={styles.list}>
          {filtered.visio.map((item) => (
            <VisioCard
              key={item.id}
              item={item}
              onPress={() =>
                router.push({ pathname: '/visio/[id]', params: { id: item.id } })
              }
            />
          ))}
        </View>
      ) : (
        <StateView empty="Aucune séance visio ne correspond à votre recherche." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 38, lineHeight: 41, color: colors.ink, marginVertical: spacing.lg },
  search: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  filter: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand,
  },
  filterActive: { backgroundColor: colors.ink },
  filterText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
  filterTextActive: { color: colors.white },
  list: { gap: spacing.lg },
});
