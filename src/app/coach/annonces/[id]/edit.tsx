import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, StateView, TopBar } from '@/components/ui';
import { weekDays } from '@/lib/availability';
import { fetchAnnonce, updateAnnonce } from '@/lib/api';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import type { Annonce } from '@/types';
import { colors, fonts, radii, spacing } from '@/theme';

export default function EditAnnonceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resource = useResource(() => fetchAnnonce(id), [id]);

  return (
    <Screen>
      <TopBar back title="Modifier l’annonce" subtitle="La modification relance la validation" />
      {resource.loading || resource.error || !resource.data ? <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} /> : <AnnonceForm key={resource.data.id} id={id} annonce={resource.data} />}
    </Screen>
  );
}

function AnnonceForm({ id, annonce }: { id: string; annonce: Annonce }) {
  const { token } = useAuth();
  const [title, setTitle] = useState(annonce.titre || annonce.title || '');
  const [description, setDescription] = useState(annonce.contenu || annonce.description || '');
  const [category, setCategory] = useState(annonce.category || '');
  const [price, setPrice] = useState(String(annonce.price || ''));
  const [duration, setDuration] = useState(String(annonce.duration || 60));
  const [days, setDays] = useState<string[]>(annonce.available_days || []);
  const [hours, setHours] = useState((annonce.available_hours || []).join(', '));
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!token) return router.replace('/auth/login');
    const ranges = hours.split(',').map((value) => value.trim()).filter(Boolean);
    if (!title.trim() || !description.trim() || Number(price) <= 0 || !days.length || !ranges.length) {
      return Alert.alert('Informations incomplètes', 'Renseignez le titre, la description, un tarif positif et vos disponibilités.');
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('titre', title.trim());
      form.append('contenu', description.trim());
      form.append('category', category.trim());
      form.append('price', price);
      form.append('duration', duration || '60');
      form.append('is_online', '1');
      form.append('type_prestation', 'visio');
      days.forEach((day) => form.append('available_days[]', day));
      ranges.forEach((range) => form.append('available_hours[]', range));
      await updateAnnonce(token, id, form);
      Alert.alert('Annonce mise à jour', 'Elle sera publiée après validation.', [{ text: 'Terminer', onPress: () => router.replace('/coach/annonces') }]);
    } catch (error) {
      Alert.alert('Modification impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
        <View style={styles.form}>
          <Field label="Titre *" value={title} onChangeText={setTitle} placeholder="Titre de la prestation" />
          <Field label="Description *" value={description} onChangeText={setDescription} multiline placeholder="Décrivez votre accompagnement" />
          <Field label="Catégorie" value={category} onChangeText={setCategory} placeholder="Fitness, yoga, nutrition…" />
          <View style={styles.row}><View style={styles.flex}><Field label="Prix (€) *" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View><View style={styles.flex}><Field label="Durée (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" /></View></View>
          <Text style={styles.label}>Jours disponibles *</Text>
          <View style={styles.days}>{weekDays.map(([value, label]) => { const active = days.includes(value); return <Pressable key={value} style={[styles.day, active && styles.active]} onPress={() => setDays((current) => active ? current.filter((day) => day !== value) : [...current, value])}><Text style={[styles.dayText, active && styles.activeText]}>{label.slice(0, 3)}</Text></Pressable>; })}</View>
          <Field label="Plages horaires *" value={hours} onChangeText={setHours} placeholder="09:00-12:00, 14:00-18:00" />
          <Button loading={loading} variant="lime" icon="checkmark" onPress={submit}>Enregistrer</Button>
        </View>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.lg, backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: { minWidth: 43, minHeight: 40, borderRadius: radii.pill, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.ink },
  dayText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted }, activeText: { color: colors.white },
});
