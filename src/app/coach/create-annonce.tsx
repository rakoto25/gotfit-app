import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, TopBar } from '@/components/ui';
import { createAnnonce } from '@/lib/api';
import { weekDays } from '@/lib/availability';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function CreateAnnonceScreen() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableHours, setAvailableHours] = useState('09:00-12:00, 14:00-18:00');
  const [loading, setLoading] = useState(false);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.82 });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function submit() {
    if (!token) return router.replace('/auth/login');
    if (!title.trim() || !description.trim()) return Alert.alert('Informations requises', 'Ajoutez un titre et une description.');
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) return Alert.alert('Tarif invalide', 'Le prix doit être strictement positif.');
    const ranges = availableHours.split(',').map((value) => value.trim()).filter(Boolean);
    if (!availableDays.length || !ranges.length || ranges.some((value) => !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
      return Alert.alert('Disponibilités requises', 'Choisissez au moins un jour et indiquez les plages au format 09:00-12:00.');
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
      form.append('city', '');
      form.append('type_prestation', 'visio');
      availableDays.forEach((day) => form.append('available_days[]', day));
      ranges.forEach((range) => form.append('available_hours[]', range));
      if (photo) {
        form.append('image', { uri: photo.uri, name: photo.fileName || `annonce-${Date.now()}.jpg`, type: photo.mimeType || 'image/jpeg' } as unknown as Blob);
      }
      const response = await createAnnonce(token, form);
      Alert.alert('Annonce envoyée ✨', response.message || 'Elle sera visible après validation.', [
        { text: 'Terminer', onPress: () => router.replace('/coach/dashboard') },
      ]);
    } catch (error) {
      Alert.alert('Publication impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar back title="Nouvelle annonce" subtitle="Créez une expérience mémorable" />
      <Pressable style={styles.photo} onPress={pick}>
        {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <><Text style={styles.photoEmoji}>📸</Text><Text style={styles.photoTitle}>Ajouter une belle photo</Text><Text style={styles.photoText}>Format paysage recommandé</Text></>}
      </Pressable>
      <View style={styles.form}>
        <Field label="Titre de l’expérience *" icon="sparkles-outline" value={title} onChangeText={setTitle} placeholder="Ex. Reset mobilité & énergie" />
        <Field label="Description *" icon="reader-outline" value={description} onChangeText={setDescription} placeholder="Décrivez la transformation proposée…" multiline />
        <Field label="Catégorie" icon="grid-outline" value={category} onChangeText={setCategory} placeholder="Fitness, yoga, nutrition…" />
        <View style={styles.row}>
          <View style={styles.flex}><Field label="Prix (€)" icon="wallet-outline" value={price} onChangeText={setPrice} placeholder="45" keyboardType="decimal-pad" /></View>
          <View style={styles.flex}><Field label="Durée (min)" icon="time-outline" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="number-pad" /></View>
        </View>
        <View style={styles.onlineNotice}>
          <Text style={styles.onlineTitle}>Prestation 100 % en ligne</Text>
          <Text style={styles.onlineText}>Les annonces Gotfit sont réalisées en visioconférence.</Text>
        </View>
        <Text style={styles.label}>Jours disponibles *</Text>
        <View style={styles.days}>
          {weekDays.slice(1).concat(weekDays.slice(0, 1)).map(([value, label]) => {
            const active = availableDays.includes(value);
            return (
              <Pressable
                key={value}
                style={[styles.day, active && styles.dayActive]}
                onPress={() => setAvailableDays((days) => active ? days.filter((day) => day !== value) : [...days, value])}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{label.slice(0, 3)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Plages horaires *" icon="time-outline" value={availableHours} onChangeText={setAvailableHours} placeholder="09:00-12:00, 14:00-18:00" />
        <Button loading={loading} variant="lime" icon="paper-plane-outline" onPress={submit}>Soumettre l’annonce</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photo: { height: 210, borderRadius: radii.xl, backgroundColor: colors.sand, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg, borderWidth: 1, borderColor: colors.line },
  photoEmoji: { fontSize: 34 },
  photoTitle: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink, marginTop: spacing.sm },
  photoText: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  form: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  onlineNotice: { borderRadius: radii.md, backgroundColor: colors.brandSoft, padding: spacing.md },
  onlineTitle: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  onlineText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 3 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: { minWidth: 43, minHeight: 40, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: colors.ink },
  dayText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
  dayTextActive: { color: colors.white },
});
