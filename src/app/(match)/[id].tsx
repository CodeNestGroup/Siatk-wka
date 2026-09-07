import { useLocalSearchParams } from 'expo-router';
import MatchView from '@/components/MatchView';

const BACK_LABELS: Record<string, string> = {
  terminarz: 'TERMINARZ',
  'moje-zapisy': 'MOJE ZAPISY',
  ogloszenie: 'OGŁOSZENIE',
};

export default function MatchDetailScreen() {
  const { id, from, fromId } = useLocalSearchParams<{ id: string; from?: string; fromId?: string }>();
  const backLabel = (from && BACK_LABELS[from]) || BACK_LABELS.terminarz;
  // Gdy ten ekran otworzył się z konkretnego ogłoszenia, zapamiętujemy jego id — jeśli w zakładce
  // "Powiadomienia" użytkownik dotknie TEGO SAMEGO ogłoszenia, wracamy (router.back), zamiast
  // pchać nowy ekran na stos i tworzyć nieskończoną pętlę mecz↔ogłoszenie↔mecz↔...
  const originAnnouncementId = from === 'ogloszenie' ? fromId : undefined;

  return <MatchView matchId={id} showBack backLabel={backLabel} originAnnouncementId={originAnnouncementId} />;
}
