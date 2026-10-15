import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar, StateView, TopBar } from '@/components/ui';
import {
  cancelOffer,
  createChatOffer,
  createOfferCheckout,
  fetchMessages,
  deleteMessage,
  getAssetUrl,
  getMessageMediaUrl,
  reactToMessage,
  sendMessage,
  updateMessage,
} from '@/lib/api';
import { formatDate, hasRole, parseDate } from '@/lib/format';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radii, shadow, spacing } from '@/theme';
import type { MessageItem } from '@/types';

type PendingImage = {
  uri: string;
  name: string;
  type: string;
  file?: Blob | null;
};

type ReactionValue = 'like' | 'dislike' | null;

type LocalReaction = {
  value: ReactionValue;
  like: number;
  dislike: number;
};

function dateKey(value?: string | null) {
  return parseDate(value)?.toDateString() || '';
}

function dayLabel(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function extensionFromAsset(asset: ImagePicker.ImagePickerAsset) {
  const mimeExtension = asset.mimeType?.split('/')[1];
  if (mimeExtension) return mimeExtension === 'jpeg' ? 'jpg' : mimeExtension;

  const uriExtension = asset.uri.split('?')[0]?.split('.').pop();
  return uriExtension && uriExtension.length <= 5 ? uriExtension : 'jpg';
}

function mimeFromAsset(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType;
  const extension = extensionFromAsset(asset).toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function pendingImageFromAsset(asset: ImagePicker.ImagePickerAsset): PendingImage {
  const extension = extensionFromAsset(asset);
  return {
    uri: asset.uri,
    name: asset.fileName || `gotfit-message-${Date.now()}.${extension}`,
    type: mimeFromAsset(asset),
    file: asset.file || null,
  };
}

function reactionState(
  message: MessageItem,
  override?: LocalReaction
): LocalReaction {
  if (override) return override;

  const reactionList = Array.isArray(message.reactions) ? message.reactions : [];
  const reactionCounts = Array.isArray(message.reactions) ? null : message.reactions;

  return {
    value: message.my_reaction || null,
    like: Number(reactionCounts?.like ?? reactionList.filter((item) => item.reaction === 'like').length ?? message.likes_count ?? 0),
    dislike: Number(reactionCounts?.dislike ?? reactionList.filter((item) => item.reaction === 'dislike').length ?? message.dislikes_count ?? 0),
  };
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [existingMediaUri, setExistingMediaUri] = useState('');
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const [offerVisible, setOfferVisible] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerSessions, setOfferSessions] = useState('1');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSaving, setOfferSaving] = useState(false);
  const [reactionOverrides, setReactionOverrides] = useState<
    Record<number, LocalReaction>
  >({});
  const scroll = useRef<ScrollView>(null);
  const optimisticCounter = useRef(-1);
  const isCoach = hasRole(user, 'intervenant');

  const resource = useResource(
    () => (token ? fetchMessages(token, id) : Promise.resolve([])),
    [token, id]
  );
  const setMessages = resource.setData;

  useEffect(() => {
    if (!token || !id) return;

    const interval = setInterval(() => {
      fetchMessages(token, id)
        .then((messages) => setMessages(messages))
        .catch(() => undefined);
    }, 8000);

    return () => clearInterval(interval);
  }, [id, setMessages, token]);

  const otherPerson = useMemo(
    () =>
      resource.data
        ?.map((message) => message.sender)
        .find((sender) => sender && Number(sender.id) !== Number(user?.id)),
    [resource.data, user?.id]
  );

  async function openGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Accès aux photos',
        'Autorisez Gotfit à accéder à vos photos pour joindre une image.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.72,
    });

    if (result.canceled || !result.assets[0]) return;

    setPendingImage(pendingImageFromAsset(result.assets[0]));
    setSendError('');
    Haptics.selectionAsync().catch(() => undefined);
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Acces camera',
        'Autorisez Gotfit a acceder a la camera pour prendre une photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.72,
    });

    if (result.canceled || !result.assets[0]) return;

    setPendingImage(pendingImageFromAsset(result.assets[0]));
    setSendError('');
    Haptics.selectionAsync().catch(() => undefined);
  }

  function pickImage() {
    Alert.alert('Ajouter une photo', 'Choisissez la source de l image.', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Galerie', onPress: openGallery },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function cancelEditing() {
    setEditingMessage(null);
    setDraft('');
    setPendingImage(null);
    setExistingMediaUri('');
    setRemoveExistingMedia(false);
    setSendError('');
  }

  function startEditing(message: MessageItem) {
    if (message.is_deleted || message.deleted_at) return;

    setEditingMessage(message);
    setDraft(message.message || '');
    setPendingImage(null);
    setExistingMediaUri(getMessageMediaUrl(message));
    setRemoveExistingMedia(false);
    setSendError('');
    requestAnimationFrame(() =>
      scroll.current?.scrollToEnd({ animated: true })
    );
    Haptics.selectionAsync().catch(() => undefined);
  }

  async function confirmDelete(message: MessageItem) {
    if (!token || sending) return;

    setSending(true);
    setSendError('');

    try {
      await deleteMessage(token, message.id);
      if (editingMessage?.id === message.id) cancelEditing();
      await resource.reload();
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => undefined);
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Le message n'a pas pu être supprimé."
      );
    } finally {
      setSending(false);
    }
  }

  function openMessageActions(message: MessageItem) {
    const mine = Number(message.sender_id) === Number(user?.id);
    if (!mine || message.is_deleted || message.deleted_at) return;

    Alert.alert(
      'Actions sur le message',
      'La modification ou la suppression sera visible pour tous les participants.',
      [
        {
          text: 'Modifier',
          onPress: () => startEditing(message),
        },
        {
          text: 'Supprimer pour tout le monde',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Supprimer ce message ?',
              'Le texte et l’image ne seront plus visibles par personne.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: () => confirmDelete(message),
                },
              ]
            ),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  async function submit() {
    const text = draft.trim();
    const hasExistingMedia =
      Boolean(existingMediaUri) && !removeExistingMedia;

    if (
      !token ||
      (!text && !pendingImage && !hasExistingMedia) ||
      sending
    ) {
      return;
    }

    const image = pendingImage;
    const editing = editingMessage;
    const optimisticId = optimisticCounter.current--;
    setDraft('');
    setPendingImage(null);
    setSendError('');
    setSending(true);

    try {
      if (editing) {
        await updateMessage(
          token,
          editing.id,
          text,
          image,
          removeExistingMedia
        );
        setEditingMessage(null);
        setExistingMediaUri('');
        setRemoveExistingMedia(false);
      } else {
        const optimistic: MessageItem = {
          id: optimisticId,
          conversation_id: Number(id),
          sender_id: Number(user?.id),
          message: text,
          media_url: image?.uri || null,
          media_full_url: image?.uri || null,
          media_type: image ? 'image' : null,
          sender: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                photo: user.photo,
                photo_url: user.photo_url,
              }
            : null,
          created_at: new Date().toISOString(),
          local_pending: true,
        };
        setMessages((current) => [...(current || []), optimistic]);
        requestAnimationFrame(() =>
          scroll.current?.scrollToEnd({ animated: true })
        );
        await sendMessage(token, id, text, image);
      }
      await resource.reload();
      requestAnimationFrame(() =>
        scroll.current?.scrollToEnd({ animated: true })
      );
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => undefined);
    } catch (error) {
      if (!editing) {
        setMessages((current) =>
          (current || []).filter((message) => message.id !== optimisticId)
        );
      }
      setDraft(text);
      setPendingImage(image);
      setEditingMessage(editing);
      setSendError(
        error instanceof Error
          ? error.message
          : "Le message n'a pas pu être envoyé."
      );
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(
    message: MessageItem,
    selected: Exclude<ReactionValue, null>
  ) {
    if (!token) return;

    const previous = reactionState(
      message,
      reactionOverrides[message.id]
    );
    const nextValue: ReactionValue =
      previous.value === selected ? null : selected;
    const next = {
      value: nextValue,
      like:
        previous.like +
        (previous.value === 'like' ? -1 : 0) +
        (nextValue === 'like' ? 1 : 0),
      dislike:
        previous.dislike +
        (previous.value === 'dislike' ? -1 : 0) +
        (nextValue === 'dislike' ? 1 : 0),
    };

    setReactionOverrides((current) => ({
      ...current,
      [message.id]: next,
    }));
    Haptics.selectionAsync().catch(() => undefined);

    try {
      await reactToMessage(token, message.id, nextValue);
    } catch {
      setReactionOverrides((current) => ({
        ...current,
        [message.id]: previous,
      }));
      Alert.alert(
        'Réaction non enregistrée',
        "Le serveur n'a pas pu enregistrer cette réaction. Réessayez."
      );
    }
  }

  async function submitOffer() {
    if (!token || offerSaving) return;
    const sessions = Number(offerSessions);
    const amount = Number(String(offerAmount).replace(',', '.'));
    if (offerTitle.trim().length < 3 || !Number.isFinite(sessions) || sessions < 1 || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Offre incomplète', 'Indiquez un titre, un nombre de séances et un montant valides.');
      return;
    }
    setOfferSaving(true);
    try {
      await createChatOffer(token, id, { title: offerTitle.trim(), description: offerDescription.trim(), session_count: sessions, amount, validity_days: 7 });
      setOfferVisible(false); setOfferTitle(''); setOfferDescription(''); setOfferSessions('1'); setOfferAmount('');
      await resource.reload();
    } catch (error) { Alert.alert('Création impossible', error instanceof Error ? error.message : 'Réessayez.'); }
    finally { setOfferSaving(false); }
  }

  async function payOffer(offerId: number) {
    if (!token) return;
    try {
      const checkout = await createOfferCheckout(token, offerId);
      if (checkout.already_paid) return resource.reload();
      if (!checkout.checkout_url) throw new Error('Lien de paiement indisponible.');
      await Linking.openURL(checkout.checkout_url);
    } catch (error) { Alert.alert('Paiement impossible', error instanceof Error ? error.message : 'Réessayez.'); }
  }

  async function revokeOffer(offerId: number) {
    if (!token) return;
    try { await cancelOffer(token, offerId); await resource.reload(); }
    catch (error) { Alert.alert('Annulation impossible', error instanceof Error ? error.message : 'Réessayez.'); }
  }

  function renderMessage(message: MessageItem, index: number) {
    const mine = Number(message.sender_id) === Number(user?.id);
    const deleted = Boolean(message.is_deleted || message.deleted_at);
    const pending = Boolean(message.local_pending);
    const mediaUrl = deleted ? '' : getMessageMediaUrl(message);
    const reaction = reactionState(
      message,
      reactionOverrides[message.id]
    );
    const previous = resource.data?.[index - 1];
    const showDay =
      index === 0 ||
      dateKey(previous?.created_at) !== dateKey(message.created_at);
    const showAvatar =
      !mine &&
      (!resource.data?.[index + 1] ||
        Number(resource.data[index + 1].sender_id) !==
          Number(message.sender_id));

    return (
      <View key={message.id}>
        {showDay && (
          <View style={styles.daySeparator}>
            <View style={styles.dayLine} />
            <Text style={styles.dayText}>{dayLabel(message.created_at)}</Text>
            <View style={styles.dayLine} />
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            mine && styles.messageRowMine,
          ]}
        >
          {!mine && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <Avatar
                  name={message.sender?.name || otherPerson?.name}
                  uri={getAssetUrl(
                    message.sender?.photo_url ||
                      message.sender?.photo ||
                      otherPerson?.photo_url ||
                      otherPerson?.photo
                  )}
                  size={32}
                />
              )}
            </View>
          )}

          <View
            style={[
              styles.bubbleWrap,
              mine && styles.bubbleWrapMine,
            ]}
          >
            {message.offer && !deleted ? (
              <View style={styles.offerCard}>
                <View style={styles.offerIcon}><Ionicons name="sparkles" size={17} color={colors.brandStrong} /></View>
                <Text style={styles.offerEyebrow}>OFFRE PERSONNALISÉE</Text>
                <Text style={styles.offerTitle}>{message.offer.title}</Text>
                {!!message.offer.description && <Text style={styles.offerDescription}>{message.offer.description}</Text>}
                <View style={styles.offerSummary}><Text style={styles.offerSummaryText}>{message.offer.session_count} séance(s)</Text><Text style={styles.offerPrice}>{Number(message.offer.amount_total || 0).toFixed(2)} {message.offer.currency || 'EUR'}</Text></View>
                <Text style={styles.offerStatus}>Statut : {message.offer.status}</Text>
                {message.offer.status === 'sent' && !isCoach ? <Pressable style={styles.offerAction} onPress={() => payOffer(message.offer!.id)}><Text style={styles.offerActionText}>Payer en sécurité</Text></Pressable> : null}
                {message.offer.status === 'sent' && isCoach ? <Pressable style={styles.offerCancel} onPress={() => revokeOffer(message.offer!.id)}><Text style={styles.offerCancelText}>Annuler l’offre</Text></Pressable> : null}
              </View>
            ) : null}
            <Pressable
              accessibilityRole={mine && !deleted ? 'button' : undefined}
              accessibilityLabel={
                mine && !deleted && !pending ? 'Ouvrir les actions du message' : undefined
              }
              onLongPress={() => {
                if (!pending) openMessageActions(message);
              }}
              style={[
                styles.bubble,
                mine && styles.bubbleMine,
                mediaUrl && styles.bubbleWithMedia,
                deleted && styles.bubbleDeleted,
                pending && styles.bubblePending,
              ]}
            >
              {mediaUrl ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Agrandir l'image"
                  onPress={() => setPreviewUri(mediaUrl)}
                  style={styles.mediaButton}
                >
                  <Image
                    source={{ uri: mediaUrl }}
                    style={styles.messageImage}
                    contentFit="cover"
                    transition={180}
                  />
                  <View style={styles.mediaZoom}>
                    <Ionicons
                      name="expand-outline"
                      size={15}
                      color={colors.white}
                    />
                  </View>
                </Pressable>
              ) : null}

              {deleted ? (
                <View style={styles.deletedMessage}>
                  <Ionicons
                    name="ban-outline"
                    size={15}
                    color={mine ? 'rgba(255,255,255,.7)' : colors.muted}
                  />
                  <Text
                    style={[
                      styles.deletedText,
                      mine && styles.deletedTextMine,
                    ]}
                  >
                    Message supprimé
                  </Text>
                </View>
              ) : message.message ? (
                <Text
                  style={[
                    styles.messageText,
                    mine && styles.messageTextMine,
                    mediaUrl && styles.messageTextWithMedia,
                  ]}
                >
                  {message.message}
                </Text>
              ) : null}

              <View style={styles.messageMeta}>
                <Text
                  style={[
                    styles.time,
                    mine && styles.timeMine,
                  ]}
                >
                  {formatDate(message.created_at, true)}
                </Text>

                {!deleted &&
                  Boolean(message.is_edited || message.edited_at) && (
                    <Text
                      style={[
                        styles.editedLabel,
                        mine && styles.timeMine,
                      ]}
                    >
                      modifié
                    </Text>
                  )}

                {pending && (
                  <Text
                    style={[
                      styles.editedLabel,
                      mine && styles.timeMine,
                    ]}
                  >
                    envoi...
                  </Text>
                )}

                {mine && (
                  <Ionicons
                    name="checkmark-done"
                    size={13}
                    color="rgba(255,255,255,.62)"
                  />
                )}
              </View>
            </Pressable>

            {!deleted && !pending && (
            <View
              style={[
                styles.reactions,
                mine && styles.reactionsMine,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="J'aime ce message"
                onPress={() => toggleReaction(message, 'like')}
                style={[
                  styles.reactionButton,
                  reaction.value === 'like' &&
                    styles.reactionButtonActive,
                ]}
              >
                <Ionicons
                  name={
                    reaction.value === 'like'
                      ? 'heart'
                      : 'heart-outline'
                  }
                  size={13}
                  color={
                    reaction.value === 'like'
                      ? colors.brand
                      : colors.muted
                  }
                />
                {reaction.like > 0 && (
                  <Text
                    style={[
                      styles.reactionCount,
                      reaction.value === 'like' &&
                        styles.reactionCountActive,
                    ]}
                  >
                    {reaction.like}
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Je n'aime pas ce message"
                onPress={() => toggleReaction(message, 'dislike')}
                style={[
                  styles.reactionButton,
                  reaction.value === 'dislike' &&
                    styles.reactionButtonDislike,
                ]}
              >
                <Ionicons
                  name={
                    reaction.value === 'dislike'
                      ? 'thumbs-down'
                      : 'thumbs-down-outline'
                  }
                  size={13}
                  color={
                    reaction.value === 'dislike'
                      ? colors.danger
                      : colors.muted
                  }
                />
                {reaction.dislike > 0 && (
                  <Text
                    style={[
                      styles.reactionCount,
                      reaction.value === 'dislike' &&
                        styles.reactionCountDislike,
                    ]}
                  >
                    {reaction.dislike}
                  </Text>
                )}
              </Pressable>

              {mine && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Modifier ou supprimer ce message"
                  onPress={() => openMessageActions(message)}
                  style={styles.reactionButton}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={14}
                    color={colors.muted}
                  />
                </Pressable>
              )}
            </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.safe}>
        <View style={styles.header}>
          <TopBar
            back
            title={otherPerson?.name || 'Conversation'}
            subtitle="Échange privé et sécurisé"
            action={
              <View style={styles.secureBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={colors.brand}
                />
                <Text style={styles.secureText}>Privé</Text>
              </View>
            }
          />
        </View>

        {resource.loading || resource.error ? (
          <StateView
            loading={resource.loading}
            error={resource.error}
            onRetry={resource.reload}
          />
        ) : (
          <ScrollView
            ref={scroll}
            style={styles.messages}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() =>
              scroll.current?.scrollToEnd({ animated: true })
            }
          >
            {resource.data?.length ? (
              resource.data.map(renderMessage)
            ) : (
              <View style={styles.emptyConversation}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={31}
                    color={colors.brand}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  Commencez la conversation
                </Text>
                <Text style={styles.emptyText}>
                  Posez une question, partagez une photo ou envoyez un
                  premier message à votre coach.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.composerArea}>
          {editingMessage && (
            <View style={styles.editBanner}>
              <View style={styles.editIcon}>
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={colors.brandStrong}
                />
              </View>
              <View style={styles.editCopy}>
                <Text style={styles.editTitle}>Modification du message</Text>
                <Text style={styles.editText}>
                  Le changement sera synchronisé pour tout le monde.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Annuler la modification"
                onPress={cancelEditing}
                style={styles.cancelEdit}
              >
                <Ionicons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>
          )}

          {(Boolean(pendingImage) ||
            (Boolean(existingMediaUri) && !removeExistingMedia)) && (
            <View style={styles.attachmentPreview}>
              <Image
                source={{ uri: pendingImage?.uri || existingMediaUri }}
                style={styles.attachmentImage}
                contentFit="cover"
              />
              <View style={styles.attachmentInfo}>
                <Text
                  numberOfLines={1}
                  style={styles.attachmentName}
                >
                  {pendingImage?.name || 'Image actuelle'}
                </Text>
                <Text style={styles.attachmentLabel}>
                  {editingMessage
                    ? 'Touchez l’icône image pour la remplacer'
                    : 'Image prête à envoyer'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Retirer l'image"
                onPress={() => {
                  setPendingImage(null);
                  if (editingMessage && existingMediaUri) {
                    setRemoveExistingMedia(true);
                  }
                }}
                style={styles.removeAttachment}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.ink}
                />
              </Pressable>
            </View>
          )}

          {sendError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.danger}
              />
              <Text style={styles.errorText}>{sendError}</Text>
            </View>
          ) : null}

          <View style={styles.composer}>
            <View style={styles.quickActions}>
              {isCoach && !editingMessage ? <Pressable accessibilityLabel="Créer une offre" onPress={() => setOfferVisible(true)} style={styles.addButton}><Ionicons name="pricetag-outline" size={21} color={colors.brand} /></Pressable> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Prendre une photo"
                onPress={openCamera}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="camera-outline"
                  size={21}
                  color={colors.brand}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter une image"
                onPress={openGallery}
                onLongPress={pickImage}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="image-outline"
                  size={21}
                  color={colors.brand}
                />
              </Pressable>
            </View>

            <TextInput
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                if (sendError) setSendError('');
              }}
              placeholder="Écrire un message…"
              placeholderTextColor="#8A958E"
              multiline
              maxLength={2000}
              style={styles.input}
              accessibilityLabel="Votre message"
              onFocus={() =>
                requestAnimationFrame(() =>
                  scroll.current?.scrollToEnd({ animated: true })
                )
              }
            />

            <Text style={styles.characterCount}>
              {draft.length > 1600 ? `${draft.length}/2000` : ''}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                editingMessage
                  ? 'Enregistrer la modification'
                  : 'Envoyer le message'
              }
              disabled={
                (!draft.trim() &&
                  !pendingImage &&
                  !(existingMediaUri && !removeExistingMedia)) ||
                sending
              }
              onPress={submit}
              style={({ pressed }) => [
                styles.sendButton,
                ((!draft.trim() &&
                  !pendingImage &&
                  !(existingMediaUri && !removeExistingMedia)) ||
                  sending) &&
                  styles.sendButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  sending
                    ? 'ellipsis-horizontal'
                    : editingMessage
                      ? 'checkmark'
                      : 'arrow-up'
                }
                size={20}
                color={colors.white}
              />
            </Pressable>
          </View>

          <Text style={styles.composerHint}>
            Appui long sur votre message pour le modifier ou le supprimer
          </Text>
        </View>
      </View>

      <Modal
        visible={Boolean(previewUri)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewUri('')}
      >
        <View style={styles.previewModal}>
          <Pressable
            accessibilityLabel="Fermer l'aperçu"
            onPress={() => setPreviewUri('')}
            style={styles.previewClose}
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>
      <Modal visible={offerVisible} transparent animationType="slide" onRequestClose={() => setOfferVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.offerModalBackdrop}>
          <View style={styles.offerModal}>
            <View style={styles.offerModalHead}><View><Text style={styles.offerModalTitle}>Créer une offre</Text><Text style={styles.offerModalText}>Elle sera envoyée dans cette conversation.</Text></View><Pressable onPress={() => setOfferVisible(false)} style={styles.cancelEdit}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
            <TextInput value={offerTitle} onChangeText={setOfferTitle} placeholder="Titre de l’accompagnement" placeholderTextColor={colors.muted} style={styles.offerInput} />
            <TextInput value={offerDescription} onChangeText={setOfferDescription} placeholder="Description (optionnelle)" placeholderTextColor={colors.muted} style={[styles.offerInput, styles.offerInputMultiline]} multiline />
            <View style={styles.offerInputRow}><TextInput value={offerSessions} onChangeText={setOfferSessions} placeholder="Séances" keyboardType="number-pad" style={[styles.offerInput, styles.offerInputHalf]} /><TextInput value={offerAmount} onChangeText={setOfferAmount} placeholder="Montant total €" keyboardType="decimal-pad" style={[styles.offerInput, styles.offerInputHalf]} /></View>
            <Pressable disabled={offerSaving} onPress={submitOffer} style={styles.offerSubmit}><Text style={styles.offerSubmitText}>{offerSaving ? 'Envoi…' : 'Envoyer l’offre'}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: 'rgba(246,243,235,.98)',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  secureText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.brandStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  messages: { flex: 1 },
  messageContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginVertical: spacing.lg,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dayText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  avatarSlot: {
    width: 40,
    minHeight: 32,
    justifyContent: 'flex-end',
  },
  bubbleWrap: {
    maxWidth: '82%',
    alignItems: 'flex-start',
  },
  bubbleWrapMine: {
    alignItems: 'flex-end',
  },
  bubble: {
    minWidth: 92,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  bubbleMine: {
    borderColor: colors.brandStrong,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 5,
    backgroundColor: colors.brandStrong,
  },
  bubbleWithMedia: {
    width: 246,
    padding: 5,
  },
  bubbleDeleted: {
    opacity: 0.78,
    borderStyle: 'dashed',
  },
  bubblePending: {
    opacity: 0.72,
  },
  offerCard: { width: 246, backgroundColor: colors.white, borderRadius: 15, padding: spacing.md, marginBottom: 7 },
  offerIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  offerEyebrow: { fontFamily: fonts.extraBold, fontSize: 8, color: colors.brandStrong, letterSpacing: 1 },
  offerTitle: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink, marginTop: 4 },
  offerDescription: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.text, marginTop: 4 },
  offerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.line },
  offerSummaryText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted }, offerPrice: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  offerStatus: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 5 },
  offerAction: { backgroundColor: colors.ink, borderRadius: radii.md, alignItems: 'center', padding: 11, marginTop: 10 }, offerActionText: { fontFamily: fonts.extraBold, fontSize: 10, color: colors.white },
  offerCancel: { alignItems: 'center', padding: 8, marginTop: 5 }, offerCancelText: { fontFamily: fonts.bold, fontSize: 9, color: colors.danger },
  deletedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  deletedText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.muted,
  },
  deletedTextMine: {
    color: 'rgba(255,255,255,.72)',
  },
  mediaButton: {
    position: 'relative',
    width: '100%',
    height: 188,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
  },
  messageImage: {
    width: '100%',
    height: '100%',
  },
  mediaZoom: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(21,33,27,.68)',
  },
  messageText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  messageTextMine: {
    color: colors.white,
  },
  messageTextWithMedia: {
    paddingHorizontal: 9,
    paddingTop: 10,
  },
  messageMeta: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: 8,
    color: colors.muted,
  },
  timeMine: {
    color: 'rgba(255,255,255,.62)',
  },
  editedLabel: {
    fontFamily: fonts.medium,
    fontSize: 7,
    color: colors.muted,
  },
  reactions: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    marginLeft: 4,
  },
  reactionsMine: {
    marginRight: 4,
    marginLeft: 0,
  },
  reactionButton: {
    minWidth: 31,
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  reactionButtonActive: {
    borderColor: colors.sageDeep,
    backgroundColor: colors.brandSoft,
  },
  reactionButtonDislike: {
    borderColor: '#E6B7B2',
    backgroundColor: '#FBE9E7',
  },
  reactionCount: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.muted,
  },
  reactionCountActive: {
    color: colors.brandStrong,
  },
  reactionCountDislike: {
    color: colors.danger,
  },
  emptyConversation: {
    alignSelf: 'center',
    maxWidth: 320,
    alignItems: 'center',
    paddingVertical: 72,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.sageDeep,
    backgroundColor: colors.brandSoft,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
  composerArea: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    backgroundColor: colors.surface,
    ...shadow,
  },
  editBanner: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    backgroundColor: colors.brandSoft,
  },
  editIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.surface,
  },
  editCopy: {
    flex: 1,
  },
  editTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.brandStrong,
  },
  editText: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.muted,
  },
  cancelEdit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  attachmentPreview: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: 8,
    backgroundColor: colors.surfaceSoft,
  },
  attachmentImage: {
    width: 66,
    height: 66,
    borderRadius: 16,
  },
  attachmentInfo: { flex: 1 },
  attachmentName: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.ink,
  },
  attachmentLabel: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.brand,
  },
  removeAttachment: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E6B7B2',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FBE9E7',
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.danger,
  },
  composer: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 20,
    padding: 6,
    backgroundColor: colors.canvas,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 1,
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 112,
    paddingHorizontal: 5,
    paddingTop: 12,
    paddingBottom: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignSelf: 'center',
    fontFamily: fonts.medium,
    fontSize: 7,
    color: colors.muted,
  },
  sendButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.brand,
  },
  sendButtonDisabled: {
    backgroundColor: colors.sageDeep,
  },
  composerHint: {
    marginTop: 6,
    marginLeft: 8,
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  previewModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(10,16,13,.96)',
  },
  previewClose: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 2,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.28)',
    backgroundColor: 'rgba(255,255,255,.08)',
  },
  previewImage: {
    width: '100%',
    height: '82%',
  },
  offerModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,16,13,.58)',
  },
  offerModal: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: 36,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.canvas,
  },
  offerModalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  offerModalTitle: { fontFamily: fonts.display, fontSize: 25, color: colors.ink },
  offerModalText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  offerInput: { minHeight: 54, borderRadius: radii.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white, paddingHorizontal: spacing.lg, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  offerInputMultiline: { minHeight: 92, paddingTop: spacing.md, textAlignVertical: 'top' },
  offerInputRow: { flexDirection: 'row', gap: spacing.md }, offerInputHalf: { flex: 1 },
  offerSubmit: { minHeight: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  offerSubmitText: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.white },
});
