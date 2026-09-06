import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// SDK 57 wprowadził nowe, klasowe API kalendarza — stare funkcje (requestCalendarPermissionsAsync,
// createEventAsync, deleteEventAsync...) rzucają wyjątkiem, jeśli zaimportować je z głównego
// 'expo-calendar'. Zostają one w pełni wspierane, ale trzeba po nie sięgnąć jawnie do .../legacy —
// robimy to celowo, bo dają prosty, stabilny sposób na "usuń wydarzenie po zapamiętanym id"
// (nowe API wymagałoby przeszukiwania wydarzeń w zakresie dat zamiast odczytu po id).
import * as Calendar from 'expo-calendar/legacy';
import { brand } from '@/constants/app-theme';

const CALENDAR_TITLE = 'ESCO VolleyManager';
const EVENT_MAP_KEY = 'calendar_event_map';

export type MatchForCalendar = {
  id: string;
  title: string | null;
  date: string; // YYYY-MM-DD
  time_start: string; // HH:MM:SS
  time_end: string; // HH:MM:SS
  location: string;
  price_per_player: number;
};

async function readEventMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeEventMap(map: Record<string, string>) {
  try {
    await AsyncStorage.setItem(EVENT_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Błąd zapisu mapy wydarzeń kalendarza:', e);
  }
}

/** Sprawdza aktualne uprawnienia, a jeśli ich brak — dopiero wtedy pyta użytkownika. */
export async function ensureCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Calendar.getCalendarPermissionsAsync();
    if (current.status === 'granted') return true;
    const requested = await Calendar.requestCalendarPermissionsAsync();
    return requested.status === 'granted';
  } catch (e) {
    console.error('Błąd uprawnień kalendarza:', e);
    return false;
  }
}

async function resolveLocalSource(): Promise<Calendar.Source> {
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.source;
  }
  // Android: konto "lokalne" telefonu — nie wymaga istniejącego konta Google/Exchange.
  // Używane tylko jako rezerwa, gdy na telefonie nie ma zapisanego konta Google (patrz niżej).
  return { isLocalAccount: true, name: CALENDAR_TITLE, type: Calendar.SourceType.LOCAL };
}

/**
 * Android: konto Google w systemowym menedżerze kont ma typ "com.google" — jeśli użytkownik ma
 * takie konto podpięte do telefonu, jego kalendarze faktycznie synchronizują się z serwerami
 * Google (w przeciwieństwie do kalendarza czysto lokalnego, który nigdy nie opuszcza urządzenia).
 * Zwraca id kalendarza głównego tego konta, żeby mecz był widoczny też w aplikacji Google Kalendarz.
 */
async function findGoogleCalendarId(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const googleCalendars = calendars.filter(
      (c) => c.allowsModifications && c.source?.type === 'com.google'
    );
    if (googleCalendars.length === 0) return null;
    return (googleCalendars.find((c) => c.isPrimary) ?? googleCalendars[0]).id;
  } catch {
    return null;
  }
}

/**
 * Znajduje kalendarz, do którego dodać mecz: na Androidzie najpierw kalendarz Google użytkownika
 * (żeby wydarzenie zsynchronizowało się do jego prawdziwego Google Kalendarza), a dopiero gdy nie
 * ma podpiętego konta Google — dedykowany kalendarz aplikacji, tworzony przy pierwszym użyciu.
 */
async function getOrCreateCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      const googleId = await findGoogleCalendarId();
      if (googleId) return googleId;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
    if (existing) return existing.id;

    const source = await resolveLocalSource();
    return await Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      color: brand.primary,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: Platform.OS === 'ios' ? source.id : undefined,
      source,
      name: 'escoVolleyManagerLocalCalendar',
      ownerAccount: Platform.OS === 'android' ? CALENDAR_TITLE : undefined,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } catch (e) {
    console.error('Błąd tworzenia kalendarza aplikacji:', e);
    return null;
  }
}

/**
 * Dodaje mecz do osobnego kalendarza "ESCO VolleyManager" na telefonie i zapamiętuje
 * id wydarzenia (per mecz) w AsyncStorage, żeby dało się je później usunąć przy wypisaniu.
 * Zwraca `true` tylko gdy wydarzenie faktycznie powstało — wywołujący pokazuje odpowiedni toast.
 */
export async function addMatchToCalendar(match: MatchForCalendar): Promise<boolean> {
  const granted = await ensureCalendarPermission();
  if (!granted) return false;

  const calendarId = await getOrCreateCalendarId();
  if (!calendarId) return false;

  try {
    const title = match.title?.trim() || 'Trening Siatkówki';
    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      location: match.location,
      startDate: new Date(`${match.date}T${match.time_start}`),
      endDate: new Date(`${match.date}T${match.time_end}`),
      notes: `${CALENDAR_TITLE} — ${Number(match.price_per_player)} PLN/os.`,
    });

    const map = await readEventMap();
    map[match.id] = eventId;
    await writeEventMap(map);
    return true;
  } catch (e) {
    console.error('Błąd dodawania meczu do kalendarza:', e);
    return false;
  }
}

/** Usuwa (jeśli istnieje) wydarzenie kalendarza powiązane z danym meczem. Bezpieczne do wywołania zawsze. */
export async function removeMatchFromCalendar(matchId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const map = await readEventMap();
  const eventId = map[matchId];
  if (!eventId) return;

  try {
    await Calendar.deleteEventAsync(eventId);
  } catch (e) {
    // Wydarzenie mogło zostać już usunięte ręcznie przez użytkownika w aplikacji kalendarza — to nie jest błąd krytyczny.
    console.warn('Nie udało się usunąć wydarzenia z kalendarza (mogło już nie istnieć):', e);
  } finally {
    delete map[matchId];
    await writeEventMap(map);
  }
}
