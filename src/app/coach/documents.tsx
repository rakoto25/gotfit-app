import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthGate, Button, Field, Screen, StateView, Tag, TopBar } from '@/components/ui';
import {
  deleteCoachCredential,
  fetchCoachCredentials,
  uploadCoachCredential,
} from '@/lib/api';
import { formatDate, hasRole, statusLabel } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';
import type { DocumentItem } from '@/types';

const types = [
  { value: 'diploma', label: 'Diplome' },
  { value: 'certification', label: 'Certification' },
  { value: 'professional_card', label: 'Carte pro' },
  { value: 'identity', label: 'Identite' },
  { value: 'other', label: 'Autre' },
] as const;

export default function CoachDocumentsScreen() {
  const { token, user } = useAuth();
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState<(typeof types)[number]['value']>('diploma');
  const [organization, setOrganization] = useState('');
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [working, setWorking] = useState(false);
  const isCoach = hasRole(user, 'intervenant');
  const resource = useResource(
    () => (token && isCoach ? fetchCoachCredentials(token) : Promise.resolve({ credentials: [], requiredTypes: [], acceptedTypes: [] })),
    [token, isCoach]
  );

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Autorisation requise', 'Autorisez l acces a vos images pour ajouter un justificatif.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled) setFile(result.assets[0]);
  }

  async function submit() {
    if (!token) return;
    if (!name.trim() || !file) {
      return Alert.alert('Justificatif incomplet', 'Ajoutez un nom et une image du document.');
    }
    setWorking(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('document_type', documentType);
      if (organization.trim()) form.append('issuing_organization', organization.trim());
      form.append(
        'file',
        {
          uri: file.uri,
          name: file.fileName || `credential-${Date.now()}.jpg`,
          type: file.mimeType || 'image/jpeg',
        } as unknown as Blob
      );
      await uploadCoachCredential(token, form);
      setName('');
      setOrganization('');
      setFile(null);
      await resource.reload();
      Alert.alert('Document envoye', 'Le justificatif attend maintenant la validation administrateur.');
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Veuillez reessayer.');
    } finally {
      setWorking(false);
    }
  }

  async function remove(document: DocumentItem) {
    if (!token) return;
    Alert.alert('Supprimer ce document ?', document.name || 'Justificatif', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            await deleteCoachCredential(token, document.id);
            await resource.reload();
          } catch (error) {
            Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Veuillez reessayer.');
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }

  if (!token || !isCoach) {
    return (
      <Screen>
        <TopBar back title="Documents coach" />
        <AuthGate message="Cet espace est reserve aux coachs Gotfit connectes." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Documents coach" subtitle="Diplomes et justificatifs" />
      <View style={styles.form}>
        <Pressable style={styles.picker} onPress={pick}>
          {file ? (
            <Image source={{ uri: file.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <Ionicons name="document-attach-outline" size={28} color={colors.ink} />
              <Text style={styles.pickerTitle}>Ajouter une image</Text>
              <Text style={styles.pickerText}>PDF non disponible sans module document-picker.</Text>
            </>
          )}
        </Pressable>
        <Field label="Nom du document" value={name} onChangeText={setName} placeholder="Ex. BPJEPS Activites de la forme" />
        <Text style={styles.label}>Type</Text>
        <View style={styles.types}>
          {types.map((item) => {
            const active = item.value === documentType;
            return (
              <Pressable key={item.value} style={[styles.type, active && styles.typeActive]} onPress={() => setDocumentType(item.value)}>
                <Text style={[styles.typeText, active && styles.typeTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Organisme emetteur" value={organization} onChangeText={setOrganization} placeholder="Federation, ecole, organisme..." />
        <Button loading={working} variant="lime" icon="cloud-upload-outline" onPress={submit}>
          Envoyer pour validation
        </Button>
      </View>

      {resource.loading || resource.error ? (
        <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      ) : resource.data?.credentials.length ? (
        <>
          <Text style={styles.heading}>Documents envoyes</Text>
          {resource.data.credentials.map((document) => (
            <View key={document.id} style={styles.document}>
              <View style={styles.documentIcon}>
                <Ionicons name="document-text-outline" size={21} color={colors.ink} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.documentTitle}>{document.name || 'Document'}</Text>
                <Text style={styles.documentText}>
                  {document.document_type || 'type'} · {formatDate(document.created_at)}
                </Text>
                {document.rejection_reason ? (
                  <Text style={styles.reason}>{document.rejection_reason}</Text>
                ) : null}
              </View>
              <View style={styles.documentSide}>
                <Tag tone={document.status === 'valide' ? 'lime' : document.status === 'refuse' ? 'coral' : 'neutral'}>
                  {statusLabel(document.status)}
                </Tag>
                <Pressable onPress={() => remove(document)} disabled={working}>
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : (
        <StateView empty="Aucun justificatif coach envoye." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { backgroundColor: colors.paper, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md, marginTop: spacing.lg },
  picker: { height: 150, borderRadius: radii.lg, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.ink, marginTop: spacing.sm },
  pickerText: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  type: { minHeight: 40, borderRadius: radii.pill, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', paddingHorizontal: spacing.md },
  typeActive: { backgroundColor: colors.ink },
  typeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted },
  typeTextActive: { color: colors.white },
  heading: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  document: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  documentIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  documentTitle: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  documentText: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 },
  reason: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: colors.danger, marginTop: 4 },
  documentSide: { alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
});
