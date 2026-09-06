// Wspólne "co się dzieje po zapisie/wypisie z meczu" — wcześniej ta sama sekwencja
// (odśwież przypomnienia, zwibruj, dodaj/usuń wpis w kalendarzu, pokaż toast) była osobno
// napisana w widoku meczu, w szczegółach ogłoszenia i w Moich zapisach. Teraz każdy z tych
// ekranów robi tylko właściwy zapis/usunięcie w match_registrations, a resztę zleca tutaj.
import { formatShortDate } from '@/lib/format';
import { successHaptic } from '@/lib/haptics';
import { showToast } from '@/lib/toast';
import type { Player } from '@/lib/player';
import { resyncNotificationsForPlayer } from './notificationService';
import { addMatchToCalendar, removeMatchFromCalendar, type MatchForCalendar } from './calendarService';

/** Wykonaj po udanym INSERCIE do match_registrations. */
export async function afterSignUp(
  match: MatchForCalendar,
  player: Player,
  opts: { isFull: boolean }
): Promise<void> {
  await resyncNotificationsForPlayer(player.id);
  successHaptic();

  const dateLbl = formatShortDate(match.date);
  let message = opts.isFull
    ? `Zapisano Cię na listę rezerwową na mecz ${dateLbl}.`
    : `Zapisano Cię na mecz ${dateLbl}.`;

  if (player.calendar_sync_enabled) {
    const added = await addMatchToCalendar(match);
    if (added) message += ' Dodano do kalendarza.';
  }

  showToast(message, 'checkmark-circle');
}

/** Wykonaj po udanym DELETE z match_registrations (pojedynczy wypis). */
export async function afterCancel(
  match: MatchForCalendar,
  player: Player,
  opts: { willPromote: boolean }
): Promise<void> {
  await resyncNotificationsForPlayer(player.id);
  successHaptic();

  if (player.calendar_sync_enabled) {
    await removeMatchFromCalendar(match.id);
  }

  const dateLbl = formatShortDate(match.date);
  const message = opts.willPromote
    ? `Wypisano Cię z meczu ${dateLbl} — miejsce przeszło do pierwszej osoby z rezerwy.`
    : `Wypisano Cię z meczu ${dateLbl}.`;

  showToast(message, 'exit-outline');
}
