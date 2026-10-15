import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, TopBar } from '@/components/ui';
import { createAnnonce, fetchAnnonce, updateAnnonce } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

const categories = ['Fitness', 'Musculation', 'Yoga', 'Nutrition', 'Bien-être', 'Running'];
const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function CreateRequestScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('60');
  const [availability, setAvailability] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchAnnonce(id).then((item) => {
      setTitle(item.titre || item.title || ''); setDescription(item.contenu || item.description || '');
      setCategory(item.category || categories[0]); setBudget(String(item.price || '')); setDuration(String(item.duration || 60));
      setSelectedDays(item.available_days || []); setAvailability((item.available_hours || []).join(', '));
    }).catch((error) => Alert.alert('Annonce indisponible', error instanceof Error ? error.message : 'Réessayez.'));
  }, [id]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Autorisation requise', 'Autorisez l’accès aux photos pour ajouter une image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: true });
    if (!result.canceled) setImage(result.assets[0]);
  }

  async function submit() {
    if (!token) return;
    if (title.trim().length < 5) return Alert.alert('Titre trop court', 'Saisissez au moins 5 caractères.');
    if (description.trim().length < 30) return Alert.alert('Description trop courte', 'Décrivez votre besoin avec au moins 30 caractères.');
    setSaving(true);
    try {
      const form = new FormData();
      form.append('titre', title.trim());
      form.append('contenu', description.trim());
      form.append('category', category);
      form.append('type_prestation', 'visio');
      form.append('is_online', '1');
      form.append('location', 'Visio GotFit');
      form.append('duration', duration || '60');
      form.append('price', budget || '0');
      selectedDays.forEach((day) => form.append('available_days[]', day));
      if (availability.trim()) form.append('available_hours[]', availability.trim());
      if (image) form.append('image', { uri: image.uri, name: image.fileName || `demande-${Date.now()}.jpg`, type: image.mimeType || 'image/jpeg' } as unknown as Blob);
      if (id) await updateAnnonce(token, id, form); else await createAnnonce(token, form);
      Alert.alert(id ? 'Demande modifiée' : 'Demande envoyée', 'Votre annonce sera visible après validation Gotfit.', [{ text: 'Voir mes annonces', onPress: () => router.replace('/annonces/mine') }]);
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Réessayez dans un instant.');
    } finally { setSaving(false); }
  }

  return (
    <Screen>
      <TopBar back title={id ? 'Modifier ma demande' : 'Créer une demande'} subtitle="Trouvez le coach adapté à votre objectif" />
      <View style={styles.intro}><Ionicons name="videocam-outline" size={22} color={colors.brandStrong} /><Text style={styles.introText}>L’accompagnement se déroule dans la salle visio sécurisée Gotfit.</Text></View>
      <View style={styles.form}>
        <Field label="Titre de votre demande" value={title} onChangeText={setTitle} placeholder="Ex. Reprise sportive progressive" />
        <Field label="Décrivez votre objectif" value={description} onChangeText={setDescription} placeholder="Votre niveau, vos attentes et contraintes…" multiline />
        <Text style={styles.label}>Spécialité recherchée</Text>
        <View style={styles.chips}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
        <View style={styles.row}>
          <View style={styles.half}><Field label="Budget / séance (€)" value={budget} onChangeText={setBudget} placeholder="Optionnel" keyboardType="decimal-pad" /></View>
          <View style={styles.half}><Field label="Durée (minutes)" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="number-pad" /></View>
        </View>
        <Text style={styles.label}>Jours préférés</Text>
        <View style={styles.chips}>{days.map((day) => { const active = selectedDays.includes(day); return <Pressable key={day} onPress={() => setSelectedDays((current) => active ? current.filter((x) => x !== day) : [...current, day])} style={[styles.day, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{day}</Text></Pressable>; })}</View>
        <Field label="Créneaux ou précisions" value={availability} onChangeText={setAvailability} placeholder="Ex. Après 18 h en semaine" />
        <Text style={styles.label}>Photo (optionnelle)</Text>
        {image ? <View style={styles.preview}><Image source={{ uri: image.uri }} style={styles.photo} contentFit="cover" /><Pressable onPress={() => setImage(null)} style={styles.remove}><Ionicons name="close" size={19} color={colors.ink} /></Pressable></View> : <Pressable onPress={pickImage} style={styles.upload}><Ionicons name="image-outline" size={21} color={colors.ink} /><Text style={styles.uploadText}>Ajouter une image JPG, PNG ou WebP</Text></Pressable>}
        <Button loading={saving} icon="send-outline" onPress={submit}>Envoyer pour validation</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.brandSoft, marginBottom: spacing.lg },
  introText: { flex: 1, fontFamily: fonts.bold, fontSize: 11, lineHeight: 17, color: colors.brandStrong }, form: { gap: spacing.lg },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.text }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper }, chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink }, chipTextActive: { color: colors.white }, day: { minWidth: 44, alignItems: 'center', paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  row: { flexDirection: 'row', gap: spacing.md }, half: { flex: 1 }, upload: { minHeight: 64, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: colors.paper },
  uploadText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, preview: { height: 170, borderRadius: radii.lg, overflow: 'hidden' }, photo: { width: '100%', height: '100%' }, remove: { position: 'absolute', top: 9, right: 9, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
