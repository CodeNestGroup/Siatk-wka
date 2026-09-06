import { useLocalSearchParams } from 'expo-router';
import MatchView from '@/components/MatchView';

const BACK_LABELS: Record<string, string> = {
  terminarz: 'TERMINARZ',
  'moje-zapisy': 'MOJE ZAPISY',
  ogloszenie: 'OGŁOSZENIE',
};

export default function MatchDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const backLabel = (from && BACK_LABELS[from]) || BACK_LABELS.terminarz;

  return <MatchView matchId={id} showBack backLabel={backLabel} />;
}
