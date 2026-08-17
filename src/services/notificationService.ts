import * as Notifications from 'expo-notifications';

export async function syncMatchNotifications(matches: Array<{ id: string; title: string | null; date: string; time_start: string; location: string; status_id: number; isRegistered?: boolean }>) {
  try {
    // 1. Anuluj poprzednie zaplanowane powiadomienia, aby uniknąć duplikatów i starych terminów
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Filtrujemy tylko nadchodzące, nieodwołane mecze, na które użytkownik jest zapisany (lub ogólnie wszystkie przyszłe, jeśli wolisz)
    // Tutaj ustawiamy dla meczów, na które użytkownik jest zapisany: (match.isRegistered && match.status_id !== 2)
    for (const match of matches) {
      if (match.status_id === 2 || !match.isRegistered) continue;

      const matchDateTime = new Date(`${match.date}T${match.time_start}`);
      // 24 godziny przed meczem
      const triggerTime = new Date(matchDateTime.getTime() - 24 * 60 * 60 * 1000);

      // Sprawdzamy czy czas powiadomienia jest w przyszłości
      if (triggerTime.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🏐 Mecz już jutro!",
            body: `Przypomnienie: ${match.title || 'Trening'} odbędzie się jutro o ${match.time_start.slice(0, 5)}. Miejsce: ${match.location}`,
            data: { screen: 'match-detail', matchId: match.id },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        });
      }
    }
  } catch (error) {
    console.error('Błąd synchronizacji powiadomień:', error);
  }
}