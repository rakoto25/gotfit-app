import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Screen, StateView, Tag, TopBar } from '@/components/ui';
import { cancelPackSession, completePackSession, declarePackSessionNoShow, disputePackSession, fetchPacks, fetchWallet, schedulePackSession, validatePackSession } from '@/lib/api';
import { formatDate, hasRole } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, spacing } from '@/theme';
import type { PackSession } from '@/types';

export default function PacksScreen() {
  const { token, user } = useAuth();
  const coach = hasRole(user, 'intervenant');
  const [scheduleTarget, setScheduleTarget] = useState<PackSession | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const resource = useResource(async () => {
    if (!token) return { packs: [], wallet: null, transactions: [] };
    const [packs, wallet] = await Promise.all([fetchPacks(token), fetchWallet(token).catch(() => ({ wallet: null, transactions: [] }))]);
    return { packs, ...wallet };
  }, [token]);

  async function run(action: (token: string, id: number, reason?: string) => Promise<unknown>, session: PackSession, reason?: string) {
    if (!token) return;
    try { await action(token, session.id, reason); await resource.reload(); }
    catch (error) { Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez.'); }
  }

  async function schedule() {
    if (!token || !scheduleTarget) return;
    const value = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (!scheduleDate || Number.isNaN(value.getTime())) return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ et une heure HH:MM.');
    try { await schedulePackSession(token, scheduleTarget.id, value.toISOString()); setScheduleTarget(null); await resource.reload(); }
    catch (error) { Alert.alert('Planification impossible', error instanceof Error ? error.message : 'Réessayez.'); }
  }

  return (
    <Screen refreshing={resource.refreshing} onRefresh={resource.reload}>
      <TopBar back title="Mes packs" subtitle="Séances, validation et cagnotte" />
      {resource.data?.wallet && <View style={styles.wallet}><Ionicons name="wallet-outline" size={25} color={colors.lime} /><View><Text style={styles.walletLabel}>Cagnotte disponible</Text><Text style={styles.walletAmount}>{Number(resource.data.wallet.balance || 0).toFixed(2)} {resource.data.wallet.currency || 'EUR'}</Text></View></View>}
      {resource.loading || resource.error ? <StateView loading={resource.loading} error={resource.error} onRetry={resource.reload} /> : null}
      <View style={styles.list}>
        {resource.data?.packs.map((pack) => (
          <View key={pack.id} style={styles.pack}>
            <View style={styles.head}><View style={styles.flex}><Text style={styles.title}>{pack.offer?.title || `Pack #${pack.id}`}</Text><Text style={styles.meta}>{pack.session_count || pack.sessions?.length || 0} séance(s) · {Number(pack.amount_total || 0).toFixed(2)} {pack.currency || 'EUR'}</Text></View><Tag tone="lime">{pack.status}</Tag></View>
            {(pack.sessions || []).map((session) => (
              <View key={session.id} style={styles.session}>
                <View style={styles.sessionCopy}><Text style={styles.sessionTitle}>Séance {session.sequence || ''}</Text><Text style={styles.meta}>{session.scheduled_at ? formatDate(session.scheduled_at, true) : 'À planifier'} · {session.status}</Text></View>
                {session.status === 'scheduled' && <View style={styles.actions}>
                  {coach ? <><Mini label="Terminée" onPress={() => run(completePackSession, session)} /><Mini label="Absent" danger onPress={() => run(declarePackSessionNoShow, session)} /></> : <><Mini label="Valider" onPress={() => run(validatePackSession, session)} /><Mini label="Signaler" danger onPress={() => run(disputePackSession, session, 'Signalé depuis l’application mobile')} /></>}
                  <Mini label="Annuler" danger onPress={() => run(cancelPackSession, session, 'Annulé depuis l’application mobile')} />
                </View>}
                {coach && ['pending', 'created', 'paid'].includes(session.status) && <Button full={false} variant="light" icon="calendar-outline" onPress={() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); setScheduleDate(tomorrow.toISOString().slice(0, 10)); setScheduleTarget(session); }}>Planifier</Button>}
                {session.status === 'completed' && !coach && <Button full={false} variant="lime" onPress={() => run(validatePackSession, session)}>Valider la séance</Button>}
              </View>
            ))}
          </View>
        ))}
      </View>
      {!resource.loading && !resource.error && !resource.data?.packs.length ? <StateView empty="Aucun pack actif. Une offre payée depuis la messagerie apparaîtra ici." /> : null}
      <Modal visible={Boolean(scheduleTarget)} transparent animationType="slide" onRequestClose={() => setScheduleTarget(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modal}>
          <Text style={styles.modalTitle}>Planifier la séance</Text><Text style={styles.modalText}>Indiquez la date et l’heure proposées au client.</Text>
          <TextInput value={scheduleDate} onChangeText={setScheduleDate} placeholder="AAAA-MM-JJ" style={styles.input} autoCapitalize="none" />
          <TextInput value={scheduleTime} onChangeText={setScheduleTime} placeholder="HH:MM" style={styles.input} keyboardType="numbers-and-punctuation" />
          <Button onPress={schedule}>Confirmer le créneau</Button><Button variant="light" onPress={() => setScheduleTarget(null)}>Fermer</Button>
        </View></View>
      </Modal>
    </Screen>
  );
}

function Mini({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.mini, danger && styles.miniDanger]}><Text style={[styles.miniText, danger && styles.miniDangerText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, wallet: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  walletLabel: { color: 'rgba(255,255,255,.65)', fontFamily: fonts.regular, fontSize: 10 }, walletAmount: { color: colors.white, fontFamily: fonts.display, fontSize: 24 },
  list: { gap: spacing.lg }, pack: { backgroundColor: colors.paper, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md }, title: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 3 }, session: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: spacing.md, gap: spacing.sm }, sessionCopy: { flex: 1 },
  sessionTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mini: { backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill }, miniDanger: { backgroundColor: '#FDE8E6' }, miniText: { fontFamily: fonts.bold, fontSize: 9, color: colors.brandStrong }, miniDangerText: { color: colors.danger },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,16,13,.55)' }, modal: { gap: spacing.md, padding: spacing.xl, paddingBottom: 36, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.canvas },
  modalTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink }, modalText: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radii.md, paddingHorizontal: spacing.lg, backgroundColor: colors.white, fontFamily: fonts.medium, color: colors.ink },
});
