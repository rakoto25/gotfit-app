import type {
  Annonce,
  AppNotification,
  ClientHistory,
  ClientNote,
  ClientOnboarding,
  CoachFavorite,
  Coach,
  CoachRevenue,
  Conversation,
  DocumentItem,
  Favorite,
  FitnessAssessment,
  FitnessAssessmentForm,
  ForumChannel,
  ForumComment,
  ForumDiscussion,
  ForumNotification,
  ForumReaction,
  MessageItem,
  Offer,
  Pack,
  PackSession,
  Payment,
  Reservation,
  Review,
  StripeConnectStatus,
  User,
  VisioSession,
  Wallet,
  WalletTransaction,
} from '@/types';

export const API_BASE_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL || 'https://api.gotfit.tech/api'
);

export const API_ORIGIN_URL = API_BASE_URL.replace(/\/api\/?$/, '');
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://gotfit.tech').replace(/\/+$/, '');

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
};

type UploadMedia = {
  uri: string;
  name: string;
  type: string;
  file?: Blob | null;
};

type ApiEnvelope<T> = T & {
  status?: number;
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0
  ) {
    super(message);
  }
}

export function normalizeApiUrl(url: string) {
  const clean = String(url || '').trim().replace(/\/+$/, '');
  if (!clean) return 'https://api.gotfit.tech/api';
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export function getAssetUrl(path?: string | null) {
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || /^data:/i.test(path)) return path;
  return `${API_ORIGIN_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getMessageMediaUrl(message: MessageItem) {
  return getAssetUrl(message.media_full_url || message.media_url);
}

function appendUpload(form: FormData, field: string, media: UploadMedia) {
  const name = media.name || `gotfit-media-${Date.now()}.jpg`;
  const type = media.type || 'image/jpeg';

  if (media.file) {
    form.append(field, media.file, name);
    return;
  }

  form.append(
    field,
    {
      uri: media.uri,
      name,
      type,
    } as unknown as Blob
  );
}

function firstError(payload: ApiEnvelope<unknown> | null) {
  return payload?.errors ? Object.values(payload.errors)[0]?.[0] : null;
}

export async function apiRequest<T>(endpoint: string, options: ApiOptions = {}) {
  const formData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined && !formData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
      {
        method: options.method || 'GET',
        headers,
        body:
          options.body === undefined
            ? undefined
            : formData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
      }
    );
  } catch {
    throw new ApiError(
      "Impossible de joindre l'API Gotfit. Verifiez votre connexion ou la configuration EXPO_PUBLIC_API_URL.",
      0
    );
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(
      firstError(payload) ||
        payload?.message ||
        (response.status === 401
          ? 'Votre session a expiré. Reconnectez-vous.'
          : 'Une erreur est survenue. Réessayez dans un instant.'),
      response.status
    );
  }

  return (payload || {}) as ApiEnvelope<T>;
}

export function normalizeArray<T>(payload: unknown, keys: string[] = []) {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [] as T[];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data as T[];
  if (
    record.data &&
    typeof record.data === 'object' &&
    Array.isArray((record.data as Record<string, unknown>).data)
  ) {
    return (record.data as { data: T[] }).data;
  }

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
    if (
      value &&
      typeof value === 'object' &&
      Array.isArray((value as Record<string, unknown>).data)
    ) {
      return (value as { data: T[] }).data;
    }
  }

  return [] as T[];
}

export async function login(email: string, password: string) {
  return apiRequest<{ token: string; user: User }>('/login', {
    method: 'POST',
    body: { email: email.trim(), password, device_name: 'gotfit-mobile' },
  });
}

export async function logout(token: string) {
  return apiRequest('/logout', { method: 'POST', token });
}

export async function register(body: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  role: 'client' | 'intervenant';
  siret?: string;
}) {
  return apiRequest<{ token: string; user: User }>('/register', {
    method: 'POST',
    body: { ...body, device_name: 'gotfit-mobile' },
  });
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ message?: string }>('/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  });
}

export async function loginWithGoogle(
  credential: string,
  role: 'client' | 'intervenant'
) {
  return apiRequest<{ token: string; user: User }>('/auth/google', {
    method: 'POST',
    body: { credential, role, device_name: 'gotfit-mobile' },
  });
}

export async function fetchProfile(token: string) {
  const payload = await apiRequest<{ user?: User; data?: User }>('/profile', { token });
  const user = payload.user || payload.data;
  if (!user?.id) throw new ApiError('Profil introuvable.');
  return user;
}

export async function fetchAnnonces() {
  const payload = await apiRequest<{ annonces?: Annonce[] }>('/annonces');
  return normalizeArray<Annonce>(payload, ['annonces']);
}

export async function fetchAnnonce(id: string | number) {
  const payload = await apiRequest<{ annonce?: Annonce }>(`/annonces/${id}/detail`);
  if (!payload.annonce?.id) throw new ApiError('Annonce introuvable.', 404);
  return payload.annonce;
}

export async function fetchCoaches() {
  const payload = await apiRequest<{ intervenants?: Coach[]; users?: Coach[] }>(
    '/intervenants'
  );
  return normalizeArray<Coach>(payload, ['intervenants', 'users']);
}

export async function fetchCoach(id: string | number) {
  const coaches = await fetchCoaches();
  const coach = coaches.find((item) => String(item.id) === String(id));
  if (!coach) throw new ApiError('Coach introuvable.', 404);
  return coach;
}

export async function fetchCoachReviews(id: string | number) {
  const payload = await apiRequest<{ reviews?: Review[] }>(`/intervenants/${id}/reviews`);
  return normalizeArray<Review>(payload, ['reviews']);
}

export async function fetchVisioSessions(token?: string | null, mine = false) {
  const payload = await apiRequest<{ sessions?: VisioSession[]; visio_sessions?: VisioSession[] }>(
    mine ? '/visio/my-sessions' : '/visio/sessions',
    { token: mine ? token : null }
  );
  return normalizeArray<VisioSession>(payload, ['sessions', 'visio_sessions']);
}

export async function fetchPlanning(token: string) {
  const payload = await apiRequest<{ reservations?: Reservation[] }>('/planning', {
    token,
  });
  return normalizeArray<Reservation>(payload, ['reservations']);
}

export async function fetchReservations(token: string, coach = false) {
  const payload = await apiRequest<{ reservations?: Reservation[] }>(
    coach ? '/reservation/intervenant' : '/reservation/client',
    { token }
  );
  return normalizeArray<Reservation>(payload, ['reservations']);
}

export async function fetchReservation(token: string, id: string | number) {
  const payload = await apiRequest<{ reservation?: Reservation }>(`/reservation/${id}`, {
    token,
  });
  if (!payload.reservation?.id) throw new ApiError('Réservation introuvable.', 404);
  return payload.reservation;
}

export async function updateReservationStatus(
  token: string,
  id: string | number,
  action: 'valider' | 'refuser' | 'terminer'
) {
  const payload = await apiRequest<{ reservation?: Reservation }>(
    `/reservation/${id}/${action}`,
    { method: 'PUT', token }
  );
  return payload.reservation;
}

export async function rescheduleReservation(
  token: string,
  id: string | number,
  body: {
    reservation_date: string;
    reservation_time: string;
    note?: string;
  }
) {
  const payloadBody = {
    ...body,
    notify_coach: true,
    source: 'gotfit-mobile',
  };
  const candidates: {
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH';
  }[] = [
    { endpoint: `/reservation/${id}/reschedule`, method: 'PUT' },
    { endpoint: `/reservation/${id}/reschedule`, method: 'POST' },
    { endpoint: `/reservation/${id}`, method: 'PATCH' },
    { endpoint: `/reservation/${id}`, method: 'PUT' },
  ];
  let unsupportedRoute = false;

  for (const candidate of candidates) {
    try {
      const payload = await apiRequest<{
        reservation?: Reservation;
        coach_notified?: boolean;
        notification_sent?: boolean;
      }>(candidate.endpoint, {
        method: candidate.method,
        token,
        body: payloadBody,
      });

      if (!payload.reservation?.id) {
        throw new ApiError('La réservation modifiée est incomplète.');
      }

      return {
        reservation: payload.reservation,
        coachNotified: Boolean(
          payload.coach_notified || payload.notification_sent
        ),
      };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 405)
      ) {
        unsupportedRoute = true;
        continue;
      }

      throw error;
    }
  }

  throw new ApiError(
    unsupportedRoute
      ? "L'API Gotfit doit activer la route de modification du créneau. Consultez BACKEND-RESERVATION-PAIEMENT.md."
      : 'Le créneau ne peut pas être modifié pour le moment.',
    501
  );
}

export async function confirmPrestation(token: string, id: string | number) {
  return apiRequest<{ reservation?: Reservation }>(
    `/reservation/${id}/confirm-prestation`,
    { method: 'POST', token }
  );
}

export async function disputePrestation(
  token: string,
  id: string | number,
  reason: string
) {
  return apiRequest<{ reservation?: Reservation }>(`/reservation/${id}/dispute`, {
    method: 'POST',
    token,
    body: { reason: reason.trim() },
  });
}

export async function submitReview(
  token: string,
  id: string | number,
  rating: number,
  comment?: string
) {
  return apiRequest<{ review?: Review }>(`/reservations/${id}/review`, {
    method: 'POST',
    token,
    body: { rating, comment: comment?.trim() || null },
  });
}

export async function fetchPayments(token: string) {
  const payload = await apiRequest<{ payments?: Payment[] }>('/my-payments', { token });
  return normalizeArray<Payment>(payload, ['payments']);
}

export async function fetchStripeConnectStatus(token: string) {
  return apiRequest<StripeConnectStatus>('/stripe/connect/status', { token });
}

export async function createStripeConnectOnboarding(token: string) {
  return apiRequest<{ url?: string; stripe_account_id?: string }>(
    '/stripe/connect/onboarding',
    { method: 'POST', token }
  );
}

export async function fetchCoachRevenue(token: string) {
  const payload = await apiRequest<{ payements?: CoachRevenue }>('/intervenant/commission', {
    token,
  });
  return payload.payements || {};
}

export async function createPaymentIntent(token: string, reservationId: string | number) {
  return apiRequest<{
    clientSecret?: string;
    payment_intent_id?: string;
    amount?: string | number;
    currency?: string;
  }>('/create-payment-intent', {
    method: 'POST',
    token,
    body: { reservation_id: reservationId },
  });
}

export async function fetchFavorites(token: string) {
  const payload = await apiRequest<{ favorites?: Favorite[] }>('/favorites', { token });
  return normalizeArray<Favorite>(payload, ['favorites']);
}

export async function addFavorite(token: string, annonceId: string | number) {
  return apiRequest(`/favorites/${annonceId}`, { method: 'POST', token });
}

export async function removeFavorite(token: string, annonceId: string | number) {
  return apiRequest(`/favorites/annonce/${annonceId}`, { method: 'DELETE', token });
}

export async function fetchCoachFavorites(token: string) {
  const payload = await apiRequest<{ favorites?: CoachFavorite[] }>('/coach-favorites', {
    token,
  });
  return normalizeArray<CoachFavorite>(payload, ['favorites']);
}

export async function addCoachFavorite(token: string, coachId: string | number) {
  return apiRequest<{ favorite?: CoachFavorite }>(`/coach-favorites/${coachId}`, {
    method: 'POST',
    token,
  });
}

export async function removeCoachFavorite(token: string, coachId: string | number) {
  return apiRequest(`/coach-favorites/${coachId}`, { method: 'DELETE', token });
}

export async function reserveAnnonce(
  token: string,
  annonceId: string | number,
  body: {
    reservation_date: string;
    reservation_time: string;
    guests: number;
    note?: string;
  }
) {
  const payload = await apiRequest<{ reservation?: Reservation }>(
    `/annonces/${annonceId}/reserve`,
    { method: 'PUT', token, body }
  );
  if (!payload.reservation?.id) throw new ApiError('Réservation incomplète.');
  return payload.reservation;
}

export async function fetchConversations(token: string) {
  const payload = await apiRequest<{ conversations?: Conversation[] }>('/conversation', {
    token,
  });
  return normalizeArray<Conversation>(payload, ['conversations']);
}

export async function startConversation(token: string, otherUserId: string | number) {
  const payload = await apiRequest<{ conversation?: Conversation }>(
    `/conversation/${otherUserId}`,
    { method: 'POST', token }
  );
  if (!payload.conversation?.id) throw new ApiError('Conversation introuvable.');
  return payload.conversation;
}

export async function fetchMessages(token: string, conversationId: string | number) {
  const payload = await apiRequest<{ messages?: MessageItem[] }>(
    `/message/${conversationId}`,
    { token }
  );
  return normalizeArray<MessageItem>(payload, ['messages']);
}

export async function sendMessage(
  token: string,
  conversationId: string | number,
  message: string,
  media?: UploadMedia | null,
  parentId?: number | null
) {
  const form = new FormData();
  const cleanMessage = message.trim();

  if (cleanMessage) {
    form.append('message', cleanMessage);
  }

  if (media) {
    appendUpload(form, 'media', media);
  }

  if (parentId) form.append('parent_id', String(parentId));

  return apiRequest<{ message?: MessageItem }>(`/message/${conversationId}`, {
    method: 'POST',
    token,
    body: form,
  });
}

export async function createChatOffer(
  token: string,
  conversationId: string | number,
  body: { title: string; session_count: number; amount: number; description?: string; validity_days?: number }
) {
  const payload = await apiRequest<{ offer?: Offer; message?: MessageItem }>(
    `/conversations/${conversationId}/offers`,
    { method: 'POST', token, body }
  );
  if (!payload.offer?.id || !payload.message?.id) throw new ApiError("L’offre n’a pas pu être créée.");
  return { offer: payload.offer, message: payload.message };
}

export async function createOfferCheckout(token: string, offerId: string | number, walletAmount = 0) {
  return apiRequest<{ checkout_url?: string; already_paid?: boolean; offer?: Offer }>(
    `/offers/${offerId}/checkout`,
    { method: 'POST', token, body: { wallet_amount: walletAmount } }
  );
}

export async function cancelOffer(token: string, offerId: string | number) {
  const payload = await apiRequest<{ offer?: Offer }>(`/offers/${offerId}/cancel`, {
    method: 'POST', token,
  });
  return payload.offer;
}

export async function fetchPacks(token: string) {
  const payload = await apiRequest<{ packs?: Pack[] }>('/packs', { token });
  return normalizeArray<Pack>(payload, ['packs']);
}

async function updatePackSession(
  token: string,
  sessionId: string | number,
  action: 'schedule' | 'complete' | 'validate' | 'dispute' | 'cancel' | 'no-show',
  body?: Record<string, unknown>
) {
  const payload = await apiRequest<{ session?: PackSession }>(`/pack-sessions/${sessionId}/${action}`, {
    method: 'POST', token, body,
  });
  if (!payload.session?.id) throw new ApiError('La séance n’a pas pu être modifiée.');
  return payload.session;
}

export const schedulePackSession = (token: string, id: number, scheduledAt: string) =>
  updatePackSession(token, id, 'schedule', { scheduled_at: scheduledAt });
export const completePackSession = (token: string, id: number) => updatePackSession(token, id, 'complete');
export const validatePackSession = (token: string, id: number) => updatePackSession(token, id, 'validate');
export const disputePackSession = (token: string, id: number, reason = 'Signalé depuis l’application mobile') => updatePackSession(token, id, 'dispute', { reason });
export const cancelPackSession = (token: string, id: number, reason?: string) => updatePackSession(token, id, 'cancel', { reason });
export const declarePackSessionNoShow = (token: string, id: number, reason?: string) => updatePackSession(token, id, 'no-show', { reason });

export async function fetchWallet(token: string) {
  const payload = await apiRequest<{
    wallet?: Wallet;
    transactions?: { data?: WalletTransaction[] } | WalletTransaction[];
  }>('/wallet', { token });
  if (!payload.wallet?.id) throw new ApiError('La cagnotte est indisponible.');
  const transactions = Array.isArray(payload.transactions)
    ? payload.transactions
    : payload.transactions?.data || [];
  return { wallet: payload.wallet, transactions };
}

export async function fetchNotifications(token: string) {
  const payload = await apiRequest<{ notifications?: AppNotification[]; unread_count?: number }>(
    '/notifications', { token }
  );
  return { notifications: payload.notifications || [], unreadCount: Number(payload.unread_count || 0) };
}

export const markNotificationRead = (token: string, id: string) =>
  apiRequest(`/notifications/${id}/read`, { method: 'PUT', token });
export const markAllNotificationsRead = (token: string) =>
  apiRequest('/notifications/read-all', { method: 'PUT', token });
export const deleteNotification = (token: string, id: string) =>
  apiRequest(`/notifications/${id}`, { method: 'DELETE', token });

export async function updateMessage(
  token: string,
  messageId: string | number,
  message: string,
  media?: UploadMedia | null,
  removeMedia = false
) {
  const form = new FormData();
  form.append('message', message.trim());
  form.append('remove_media', removeMedia ? '1' : '0');

  if (media) {
    appendUpload(form, 'media', media);
  }

  return apiRequest<{ message?: MessageItem }>(`/message/${messageId}/update`, {
    method: 'POST',
    token,
    body: form,
  });
}

export async function deleteMessage(
  token: string,
  messageId: string | number
) {
  return apiRequest<{ message?: MessageItem; deleted?: boolean }>(
    `/message/${messageId}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export async function reactToMessage(
  token: string,
  messageId: string | number,
  reaction: 'like' | 'dislike' | null
) {
  return apiRequest<{
    message?: MessageItem;
    reactions?: MessageItem['reactions'];
  }>(`/message/${messageId}/reaction`, {
    method: reaction ? 'POST' : 'DELETE',
    token,
    body: reaction ? { reaction } : undefined,
  });
}

export async function registerPushToken(
  token: string,
  pushToken: string,
  platform: string
) {
  return apiRequest('/push-tokens', {
    method: 'POST',
    token,
    body: {
      token: pushToken,
      expo_push_token: pushToken,
      platform,
      device_name: 'gotfit-mobile',
    },
  });
}

export async function joinVisio(token: string, id: string | number) {
  return apiRequest<{
    join_url?: string;
    server_url?: string;
    token?: string;
    participant_token?: string;
  }>(`/visio/sessions/${id}/join`, { method: 'POST', token });
}

export async function reserveVisio(token: string, id: string | number) {
  return apiRequest(`/visio/sessions/${id}/reserve`, { method: 'POST', token });
}

export async function submitContact(body: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  return apiRequest<{ success?: boolean; message?: string }>('/contact', {
    method: 'POST',
    body,
  });
}

export async function fetchOnboarding(token: string) {
  const payload = await apiRequest<{ onboarding?: ClientOnboarding }>(
    '/client/onboarding',
    { token }
  );
  return payload.onboarding || {};
}

export async function saveOnboarding(token: string, body: ClientOnboarding) {
  return apiRequest<{ onboarding?: ClientOnboarding }>('/client/onboarding', {
    method: 'PUT',
    token,
    body,
  });
}

export async function fetchFitnessAssessmentForm(token: string) {
  const payload = await apiRequest<{ form?: FitnessAssessmentForm }>(
    '/fitness-assessment/form',
    { token }
  );
  return payload.form || null;
}

export async function fetchMyFitnessAssessment(token: string) {
  const payload = await apiRequest<{ assessment?: FitnessAssessment }>(
    '/fitness-assessment',
    { token }
  );
  return payload.assessment || null;
}

export async function saveFitnessAssessment(
  token: string,
  body: {
    form_id?: number | null;
    answers: Record<string, unknown>;
    status?: 'draft' | 'submitted';
  }
) {
  return apiRequest<{ assessment?: FitnessAssessment }>('/fitness-assessment', {
    method: 'PUT',
    token,
    body,
  });
}

export async function fetchClientHistory(token: string, clientId: string | number) {
  const payload = await apiRequest<ClientHistory>(`/clients/${clientId}/history`, {
    token,
  });
  return {
    client: payload.client || null,
    summary: payload.summary || {},
    reservations: normalizeArray<Reservation>(payload, ['reservations']),
  } as ClientHistory;
}

export async function fetchClientNotes(token: string, clientId: string | number) {
  const payload = await apiRequest<{ notes?: ClientNote[] }>(
    `/clients/${clientId}/notes`,
    { token }
  );
  return normalizeArray<ClientNote>(payload, ['notes']);
}

export async function createClientNote(
  token: string,
  clientId: string | number,
  body: {
    title?: string;
    content: string;
    visibility?: 'private' | 'shared';
    reservation_id?: number | null;
    is_pinned?: boolean;
  }
) {
  return apiRequest<{ note?: ClientNote }>(`/clients/${clientId}/notes`, {
    method: 'POST',
    token,
    body,
  });
}

export async function updateClientNote(
  token: string,
  noteId: string | number,
  body: Partial<Pick<ClientNote, 'title' | 'content' | 'visibility' | 'is_pinned'>>
) {
  return apiRequest<{ note?: ClientNote }>(`/client-notes/${noteId}`, {
    method: 'PATCH',
    token,
    body,
  });
}

export async function deleteClientNote(token: string, noteId: string | number) {
  return apiRequest(`/client-notes/${noteId}`, { method: 'DELETE', token });
}

export async function fetchClientFitnessAssessments(
  token: string,
  clientId: string | number
) {
  const payload = await apiRequest<{
    client?: User;
    assessments?: FitnessAssessment[];
  }>(`/clients/${clientId}/fitness-assessments`, { token });
  return normalizeArray<FitnessAssessment>(payload, ['assessments']);
}

export async function reviewFitnessAssessment(
  token: string,
  assessmentId: string | number,
  coachNotes: string
) {
  return apiRequest<{ assessment?: FitnessAssessment }>(
    `/fitness-assessments/${assessmentId}/review`,
    {
      method: 'PATCH',
      token,
      body: { coach_notes: coachNotes.trim() },
    }
  );
}

export async function fetchMyDocuments(token: string) {
  const payload = await apiRequest<{ documents?: DocumentItem[] }>('/documents/my', {
    token,
  });
  return normalizeArray<DocumentItem>(payload, ['documents']);
}

export async function uploadDocument(token: string, body: FormData) {
  return apiRequest<{ document?: DocumentItem }>('/documents', {
    method: 'POST',
    token,
    body,
  });
}

export async function fetchCoachCredentials(token: string) {
  const payload = await apiRequest<{
    credentials?: DocumentItem[];
    required_types?: string[];
    accepted_types?: string[];
  }>('/coach/credentials', { token });
  return {
    credentials: normalizeArray<DocumentItem>(payload, ['credentials']),
    requiredTypes: payload.required_types || [],
    acceptedTypes: payload.accepted_types || [],
  };
}

export async function uploadCoachCredential(token: string, body: FormData) {
  return apiRequest<{ document?: DocumentItem }>('/coach/credentials', {
    method: 'POST',
    token,
    body,
  });
}

export async function deleteCoachCredential(token: string, id: string | number) {
  return apiRequest(`/coach/credentials/${id}`, { method: 'DELETE', token });
}

export async function updateProfile(token: string, body: FormData) {
  const payload = await apiRequest<{ user?: User }>('/profile/update', {
    method: 'POST',
    token,
    body,
  });
  if (!payload.user?.id) throw new ApiError('Le profil a été modifié, mais la réponse est incomplète.');
  return payload.user;
}

export async function createAnnonce(token: string, body: FormData) {
  return apiRequest<{ annonce?: Annonce }>('/annonces', {
    method: 'POST',
    token,
    body,
  });
}

export async function fetchMyAnnonces(token: string) {
  const payload = await apiRequest<{ annonces?: Annonce[] }>('/annonces/my', { token });
  return normalizeArray<Annonce>(payload, ['annonces']);
}

export async function updateAnnonce(token: string, id: string | number, body: FormData) {
  const payload = await apiRequest<{ annonce?: Annonce }>(`/annonces/${id}`, {
    method: 'POST',
    token,
    body,
  });
  if (!payload.annonce?.id) throw new ApiError("L’annonce a été modifiée, mais la réponse est incomplète.");
  return payload.annonce;
}

export async function deleteAnnonce(token: string, id: string | number) {
  return apiRequest(`/annonces/${id}`, { method: 'DELETE', token });
}

type ForumPage<T> = { data?: T[]; current_page?: number; last_page?: number; total?: number };

export async function fetchForumChannels(token: string) {
  const payload = await apiRequest<{ channels?: ForumChannel[] }>('/forum/channels', { token });
  return normalizeArray<ForumChannel>(payload, ['channels']);
}

export async function fetchForumDiscussions(
  token: string,
  params: { channel?: string; q?: string; sort?: 'recent' | 'popular' } = {}
) {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const payload = await apiRequest<{ discussions?: ForumPage<ForumDiscussion> }>(
    `/forum/discussions${query ? `?${query}` : ''}`,
    { token }
  );
  return payload.discussions?.data || [];
}

export async function fetchForumDiscussion(token: string, id: string | number) {
  const payload = await apiRequest<{ discussion?: ForumDiscussion; comments?: ForumComment[] }>(
    `/forum/discussions/${id}`,
    { token }
  );
  if (!payload.discussion) throw new ApiError('Discussion introuvable.', 404);
  return { discussion: payload.discussion, comments: payload.comments || [] };
}

export async function createForumDiscussion(
  token: string,
  body: { channel_id: number; title: string; body: string }
) {
  const payload = await apiRequest<{ discussion?: ForumDiscussion }>('/forum/discussions', {
    method: 'POST', token, body,
  });
  if (!payload.discussion) throw new ApiError('Discussion créée, mais réponse incomplète.');
  return payload.discussion;
}

export async function deleteForumDiscussion(token: string, id: number) {
  return apiRequest(`/forum/discussions/${id}`, { method: 'DELETE', token });
}

export async function createForumComment(
  token: string,
  discussionId: number,
  body: string,
  parentId?: number | null
) {
  const payload = await apiRequest<{ comment?: ForumComment }>(
    `/forum/discussions/${discussionId}/comments`,
    { method: 'POST', token, body: { body, parent_id: parentId || null } }
  );
  if (!payload.comment) throw new ApiError('Réponse publiée, mais réponse API incomplète.');
  return payload.comment;
}

export async function deleteForumComment(token: string, id: number) {
  return apiRequest(`/forum/comments/${id}`, { method: 'DELETE', token });
}

export async function reactToForumTarget(
  token: string,
  target: 'discussions' | 'comments',
  id: number,
  type: ForumReaction
) {
  return apiRequest(`/forum/${target}/${id}/reactions`, { method: 'POST', token, body: { type } });
}

export async function reportForumTarget(
  token: string,
  target: 'discussions' | 'comments',
  id: number,
  details?: string
) {
  return apiRequest(`/forum/${target}/${id}/report`, {
    method: 'POST', token, body: { reason: 'other', details: details || "Signalé depuis l’application mobile." },
  });
}

export async function fetchForumNotifications(token: string) {
  const payload = await apiRequest<{
    notifications?: ForumPage<ForumNotification>;
    unread_count?: number;
  }>('/forum/notifications', { token });
  return {
    notifications: payload.notifications?.data || [],
    unreadCount: Number(payload.unread_count || 0),
  };
}

export async function markForumNotificationRead(token: string, id: number) {
  return apiRequest(`/forum/notifications/${id}/read`, { method: 'PUT', token });
}

export async function markAllForumNotificationsRead(token: string) {
  return apiRequest('/forum/notifications/read-all', { method: 'PUT', token });
}

export async function createVisio(
  token: string,
  body: {
    title: string;
    description?: string;
    start_at: string;
    duration_minutes: number;
    min_participants: number;
    max_participants?: number;
    price: number;
    currency: string;
  }
) {
  return apiRequest<{ session?: VisioSession }>('/visio/sessions', {
    method: 'POST',
    token,
    body,
  });
}
