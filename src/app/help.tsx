import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, TopBar } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/theme';

const faqs = [
  ['Comment réserver une séance ?', 'Ouvrez une expérience, choisissez Réserver, puis sélectionnez la date et l’heure qui vous conviennent.'],
  ['Comment fonctionne une séance visio ?', 'Réservez votre place dans Explorer. Le bouton Rejoindre devient disponible quand le coach démarre la salle.'],
  ['Puis-je modifier mes objectifs ?', 'Oui. Depuis votre profil, ouvrez Mes objectifs et mettez à jour vos préférences à tout moment.'],
  ['Où retrouver mes réservations ?', 'Toutes vos séances à venir et passées sont regroupées dans l’onglet Planning.'],
  ['Comment devenir coach ?', 'Créez un compte Coach lors de l’inscription, puis complétez votre profil professionnel.'],
];

export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen>
      <TopBar back title="Centre d’aide" subtitle="Des réponses simples, tout de suite" />
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="help-buoy" size={28} color={colors.ink} /></View>
        <Text style={styles.heroTitle}>Comment pouvons-nous vous aider ?</Text>
      </View>
      <Text style={styles.heading}>Questions fréquentes</Text>
      <View style={styles.faqs}>
        {faqs.map(([question, answer], index) => {
          const active = open === index;
          return (
            <Pressable key={question} style={styles.faq} onPress={() => setOpen(active ? null : index)}>
              <View style={styles.faqTop}>
                <Text style={styles.question}>{question}</Text>
                <Ionicons name={active ? 'remove' : 'add'} size={20} color={colors.ink} />
              </View>
              {active && <Text style={styles.answer}>{answer}</Text>}
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.contact} onPress={() => router.push('/contact')}>
        <View><Text style={styles.contactTitle}>Besoin d’un humain ?</Text><Text style={styles.contactText}>Écrivez directement à notre équipe.</Text></View>
        <Ionicons name="arrow-forward-circle" size={36} color={colors.lime} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.lime, borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', marginVertical: spacing.lg },
  heroIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 27, lineHeight: 31, color: colors.ink, textAlign: 'center', marginTop: spacing.lg },
  heading: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.ink, marginVertical: spacing.lg },
  faqs: { backgroundColor: colors.paper, borderRadius: radii.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.line },
  faq: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  faqTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  question: { flex: 1, fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  answer: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.muted, marginTop: spacing.md },
  contact: { marginTop: spacing.xl, backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.white },
  contactText: { fontFamily: fonts.regular, fontSize: 9, color: 'rgba(255,255,255,.65)', marginTop: 3 },
});
