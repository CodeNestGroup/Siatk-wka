export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Teraz';
  if (diffMin < 60) return `${diffMin} min temu`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} godz. temu`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Wczoraj';
  if (diffD < 7) return `${diffD} dni temu`;

  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

const WEEKDAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

export function formatMatchDate(dateStr: string): { weekday: string; day: number; month: string } {
  // dateStr w formacie YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    weekday: WEEKDAYS[date.getDay()],
    day: date.getDate(),
    month: MONTHS[date.getMonth()],
  };
}

export function formatTime(timeStr: string): string {
  // timeStr w formacie HH:MM:SS -> HH:MM
  return timeStr?.slice(0, 5) ?? '';
}

export function isDateInPast(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const matchDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return matchDate < today;
}