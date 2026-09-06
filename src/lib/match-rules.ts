// Wspólne reguły biznesowe dotyczące meczów — wcześniej powielone w czterech ekranach.
// Trzymane w jednym miejscu, żeby zmiana progu (np. "2 godziny przed startem") nie wymagała
// pamiętania o czterech kopiach tej samej funkcji.

/** Czy wciąż można się wypisać: musi zostać więcej niż 2h do startu meczu. */
export function canCancelMatch(matchDateStr: string, matchTimeStartStr: string): boolean {
  try {
    const matchDateTime = new Date(`${matchDateStr}T${matchTimeStartStr}`);
    const diffHours = (matchDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours > 2;
  } catch {
    // Błędny/nieoczekiwany format daty — bezpieczniej nie blokować wypisu niż zablokować bez powodu.
    return true;
  }
}

/** Czy mecz się już zakończył (liczone od godziny końca, z fallbackiem na godzinę startu). */
export function isMatchFinished(dateStr: string, timeEndStr: string, timeStartStr: string): boolean {
  try {
    const timeString = timeEndStr || timeStartStr || '23:59';
    return new Date(`${dateStr}T${timeString}`).getTime() < Date.now();
  } catch {
    return false;
  }
}
