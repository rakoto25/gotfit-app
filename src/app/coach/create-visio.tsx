import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen, TopBar } from '@/components/ui';
import { createVisio } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function CreateVisioScreen() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(() => new Date(Date.now() + 86400000));
  const [duration, setDuration] = useState('60');
  const [minimum, setMinimum] = useState('2');
  const [maximum, setMaximum] = useState('12');
  const [price, setPrice] = useState('0');
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!token) return router.replace('/auth/login');
    if (!title.trim()) return Alert.alert('Titre requis', 'Donnez un nom à votre séance.');
    setLoading(true);
    try {
      await createVisio(token, {
        title: title.trim(),
        description: description.trim(),
        start_at: start.toISOString(),
        duration_minutes: Number(duration) || 60,
        min_participants: Number(minimum) || 1,
        max_participants: Number(maximum) || undefined,
        price: Number(price) || 0,
        currency: 'EUR',
      });
      Alert.alert('Visio créée ✨', 'Les membres peuvent maintenant réserver leur place.', [
        { text: 'Terminer', onPress: () => router.replace('/coach/dashboard') },
      ]);
    } catch (error) {
      Alert.alert('Création impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar back title="Nouvelle visio" subtitle="Rassemblez votre communauté" />
      <View style={styles.hero}><Text style={styles.emoji}>🎥</Text><Text style={styles.heroTitle}>Un live qui crée du lien.</Text><Text style={styles.heroText}>Préparez une séance claire, rythmée et accueillante.</Text></View>
      <View style={styles.form}>
        <Field label="Titre de la séance *" icon="videocam-outline" value={title} onChangeText={setTitle} placeholder="Ex. Mobilité du matin" />
        <Field label="Description" icon="reader-outline" value={description} onChangeText={setDescription} placeholder="Objectifs et déroulé de la séance…" multiline />
        <Text style={styles.label}>Date et heure</Text>
        <View style={styles.row}>
          <Pressable style={styles.picker} onPress={() => setPicker('date')}><Text style={styles.pickerText}>{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(start)}</Text></Pressable>
          <Pressable style={styles.picker} onPress={() => setPicker('time')}><Text style={styles.pickerText}>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(start)}</Text></Pressable>
        </View>
        {picker && (
          <DateTimePicker
            value={start}
            mode={picker}
            minimumDate={picker === 'date' ? new Date() : undefined}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_, value) => {
              setStart(value);
              if (Platform.OS !== 'ios') setPicker(null);
            }}
            onDismiss={() => {
              if (Platform.OS !== 'ios') setPicker(null);
            }}
          />
        )}
        {Platform.OS === 'ios' && picker && <Button full={false} variant="light" onPress={() => setPicker(null)}>Valider</Button>}
        <View style={styles.row}>
          <View style={styles.flex}><Field label="Durée (min)" icon="time-outline" value={duration} onChangeText={setDuration} keyboardType="number-pad" /></View>
          <View style={styles.flex}><Field label="Prix (€)" icon="wallet-outline" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}><Field label="Minimum" icon="people-outline" value={minimum} onChangeText={setMinimum} keyboardType="number-pad" /></View>
          <View style={styles.flex}><Field label="Maximum" icon="people-outline" value={maximum} onChangeText={setMaximum} keyboardType="number-pad" /></View>
        </View>
        <Button loading={loading} variant="lime" icon="add-circle-outline" onPress={submit}>Créer la séance</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.lavender, borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', marginVertical: spacing.lg },
  emoji: { fontSize: 42 },
  heroTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: spacing.md },
  heroText: { fontFamily: fonts.regular, fontSize: 10, color: colors.inkSoft, marginTop: 4 },
  form: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.line },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', gap: spacing.sm },
  picker: { flex: 1, minHeight: 53, borderRadius: radii.md, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  pickerText: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.ink },
});
