import type { Annonce, Coach, Reservation, User } from '@/types';

export type DateInput = Date | string | number | null | undefined;

/**
 * Convertit les formats de date couramment renvoyés par l'API Gotfit en
 * véritable Date, sans jamais laisser une date invalide atteindre Intl.
 */
export function parseDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (
    !raw ||
    /^(null|undefined|invalid date)$/i.test(raw) ||
    raw.startsWith('0000-00-00')
  ) {
    return null;
  }

  // React Native/Hermes interprète plus régulièrement le format ISO avec T.
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)
    ? raw.replace(/\s+/, 'T')
    : raw;
  const nativeDate = new Date(normalized);

  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  // Fallback pour les dates françaises éventuellement renvoyées par l'API.
  const frenchDate = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!frenchDate) return null;

  const [, day, month, year, hour = '0', minute = '0', second = '0'] =
    frenchDate;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isReservationPaid(reservation?: Reservation | null) {
  return (
    Boolean(reservation?.is_paid) ||
    String(reservation?.payment_status || '').toLowerCase() === 'paid'
  );
}

export function canReviewReservation(reservation?: Reservation | null) {
  return Boolean(
    reservation &&
      isReservationPaid(reservation) &&
      String(reservation.status || '').toLowerCase() === 'realise' &&
      !reservation.review
  );
}

export function formatMoney(value?: string | number | null, currency = 'EUR') {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${value ?? 0} €`;

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: DateInput, withTime = false) {
  const date = parseDate(value);
  if (!date) return 'À programmer';

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function annonceTitle(item?: Annonce | null) {
  return item?.titre || item?.title || 'Expérience Gotfit';
}

export function annonceDescription(item?: Annonce | null) {
  return item?.contenu || item?.description || 'Une expérience pensée pour vous faire progresser.';
}

export function coachName(item?: Coach | User | null) {
  return item?.name || 'Coach Gotfit';
}

export function coachTitle(item?: Coach | null) {
  return (
    item?.coach_title ||
    item?.title ||
    item?.job_title ||
    item?.profession ||
    item?.coach_speciality ||
    'Coach bien-être'
  );
}

export function coachDescription(item?: Coach | null) {
  return (
    item?.coach_short_description ||
    item?.bio ||
    item?.about ||
    item?.description ||
    'Un accompagnement humain, progressif et adapté à votre rythme.'
  );
}

export function hasRole(user: User | null | undefined, role: string) {
  const searched = role.toLowerCase();
  return Boolean(
    user?.roles?.some(
      (item) =>
        item.slug?.toLowerCase() === searched ||
        item.name?.toLowerCase() === searched
    )
  );
}

export function reservationDate(reservation: Reservation) {
  const explicitStart = reservation.start?.trim();
  if (explicitStart && parseDate(explicitStart)) return explicitStart;

  const rawDate = reservation.reservation_date?.trim();
  if (!rawDate) return null;

  // Certains endpoints renvoient déjà une date et une heure complètes.
  if (/[T ]\d{1,2}:\d{2}/.test(rawDate) && parseDate(rawDate)) {
    return rawDate;
  }

  const rawTime = reservation.reservation_time?.trim() || '09:00:00';
  const separator = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? 'T' : ' ';
  const combined = `${rawDate}${separator}${rawTime}`;

  return parseDate(combined) ? combined : parseDate(rawDate) ? rawDate : null;
}

export function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    en_attente: 'En attente',
    confirme: 'Confirmée',
    confirmed: 'Confirmée',
    valide: 'Validée',
    approved: 'Approuvée',
    paid: 'Payée',
    live: 'En direct',
    ended: 'Terminée',
    termine: 'Terminée',
    cancelled: 'Annulée',
    annule: 'Annulée',
    refuse: 'Refusée',
    draft: 'Brouillon',
    open: 'Ouverte',
  };

  return status ? labels[status.toLowerCase()] || status : 'À venir';
}
