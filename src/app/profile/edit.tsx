import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Field, Screen, TopBar } from '@/components/ui';
import { getAssetUrl, updateProfile } from '@/lib/api';
import { hasRole } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';

export default function EditProfileScreen() {
  const { token, user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [coachTitle, setCoachTitle] = useState(user?.coach_title || '');
  const [speciality, setSpeciality] = useState(user?.coach_speciality || '');
  const [siret, setSiret] = useState(user?.siret || '');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const isCoach = hasRole(user, 'intervenant');

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Autorisation requise', 'Autorisez Gotfit à accéder à vos photos.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function submit() {
    if (!token || !user) return router.replace('/auth/login');
    if (!name.trim() || !email.trim()) {
      return Alert.alert('Informations requises', 'Le nom et l’adresse e-mail sont obligatoires.');
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('display_name', displayName.trim());
      form.append('email', email.trim());
      form.append('phone', phone.trim());
      form.append('address', address.trim());
      form.append('bio', bio.trim());
      if (isCoach) {
        if (siret.replace(/\D/g, '').length !== 14) {
          throw new Error('Le SIRET doit contenir exactement 14 chiffres.');
        }
        form.append('coach_title', coachTitle.trim());
        form.append('coach_speciality', speciality.trim());
        form.append('siret', siret.replace(/\D/g, ''));
      }
      if (photo) {
        const fileName = photo.fileName || `profil-${Date.now()}.jpg`;

        if (photo.file) {
          form.append('photo', photo.file, fileName);
        } else {
          form.append(
            'photo',
            {
              uri: photo.uri,
              name: fileName,
              type: photo.mimeType || 'image/jpeg',
            } as unknown as Blob
          );
        }
      }
      const updated = await updateProfile(token, form);
      await setUser(updated);
      Alert.alert('Profil actualisé ✨', 'Vos nouvelles informations sont enregistrées.', [
        { text: 'Terminer', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Modification impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <Screen>
        <TopBar back title="Modifier mon profil" />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar back title="Modifier mon profil" subtitle="Exprimez qui vous êtes" />
      <View style={styles.photo}>
        <Avatar name={name} uri={photo?.uri || getAssetUrl(user.photo_url || user.photo)} size={108} ring />
        <Pressable style={styles.camera} onPress={choosePhoto}>
          <Ionicons name="camera" size={19} color={colors.ink} />
        </Pressable>
        <Text style={styles.photoHint}>Touchez l’appareil pour changer la photo</Text>
      </View>
      <View style={styles.form}>
        <Field label="Nom complet" icon="person-outline" value={name} onChangeText={setName} placeholder="Votre nom" />
        <Field label="Pseudo public" icon="at-outline" value={displayName} onChangeText={setDisplayName} placeholder="Nom affiché aux autres membres" />
        <Field label="Adresse e-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="vous@exemple.com" autoCapitalize="none" keyboardType="email-address" />
        <Field label="Téléphone" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+33…" keyboardType="phone-pad" />
        <Field label="Adresse" icon="location-outline" value={address} onChangeText={setAddress} placeholder="Ville ou adresse" />
        <Field label="À propos de vous" icon="reader-outline" value={bio} onChangeText={setBio} placeholder="Votre histoire, vos motivations…" multiline />
        {isCoach && (
          <>
            <Text style={styles.section}>Profil professionnel</Text>
            <Field label="SIRET *" icon="business-outline" value={siret} onChangeText={setSiret} placeholder="123 456 789 00012" keyboardType="number-pad" />
            <Field label="Titre de coach" icon="ribbon-outline" value={coachTitle} onChangeText={setCoachTitle} placeholder="Coach sportif & mobilité" />
            <Field label="Spécialités" icon="sparkles-outline" value={speciality} onChangeText={setSpeciality} placeholder="Fitness, mobilité, nutrition…" />
          </>
        )}
        <Button loading={loading} variant="lime" icon="checkmark-outline" onPress={submit}>
          Enregistrer les changements
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', paddingVertical: spacing.xxl },
  camera: { position: 'absolute', top: 100, right: '34%', width: 40, height: 40, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.canvas },
  photoHint: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: spacing.md },
  form: { backgroundColor: colors.paper, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.line },
  section: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.ink, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
});
