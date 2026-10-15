import type { Annonce } from '@/types';

export const weekDays = [
  ['sunday', 'Dimanche'], ['monday', 'Lundi'], ['tuesday', 'Mardi'],
  ['wednesday', 'Mercredi'], ['thursday', 'Jeudi'], ['friday', 'Vendredi'],
  ['saturday', 'Samedi'],
] as const;

export function toLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function availableTimes(annonce: Annonce | null | undefined, date: string, now = new Date()) {
  if (!annonce || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const day = new Date(`${date}T12:00:00`).getDay();
  if (!annonce.available_days?.includes(weekDays[day][0])) return [];
  const duration = Number(annonce.duration) || 60;
  const slots = new Set<string>();
  for (const range of annonce.available_hours || []) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/.exec(range);
    if (!match) continue;
    const start = Number(match[1]) * 60 + Number(match[2]);
    const end = Number(match[3]) * 60 + Number(match[4]);
    for (let minute = start; minute + duration <= end; minute += duration) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      if (new Date(`${date}T${time}:00`) > now) slots.add(time);
    }
  }
  return [...slots].sort();
}
