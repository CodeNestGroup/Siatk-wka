import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/lib/supabase';

const SEEN_ANN_KEY = 'seen_announcements_at';
const SEEN_MATCH_KEY = 'seen_matches_at';
const OPENED_ANN_KEY = 'opened_announcements';
const OPENED_MATCH_KEY = 'opened_matches';
export const BADGES_CHANGED_EVENT = 'badgesChanged';

async function readSet(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

async function addToSet(key: string, id: string) {
  const set = await readSet(key);
  if (set.has(id)) return;
  set.add(id);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Błąd zapisu znacznika otwarcia:', e);
  }
}

function isNewItem(createdAt: string, seenAt: string | null, id: string, opened: Set<string>): boolean {
  if (opened.has(id)) return false;
  if (!seenAt) return true;
  return new Date(createdAt).getTime() > new Date(seenAt).getTime();
}

type Kind = 'announcements' | 'matches';

const KEYS: Record<Kind, { seen: string; opened: string }> = {
  announcements: { seen: SEEN_ANN_KEY, opened: OPENED_ANN_KEY },
  matches: { seen: SEEN_MATCH_KEY, opened: OPENED_MATCH_KEY },
};

// Licznik na pastylce zakładki: zawsze aktualny stan seen_*_at, odświeżany na żądanie i po zdarzeniu BADGES_CHANGED_EVENT.
export function useBadgeCounts() {
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);

  const refresh = useCallback(async () => {
    const [seenAnnAt, seenMatchAt, openedAnn, openedMatch] = await Promise.all([
      AsyncStorage.getItem(SEEN_ANN_KEY),
      AsyncStorage.getItem(SEEN_MATCH_KEY),
      readSet(OPENED_ANN_KEY),
      readSet(OPENED_MATCH_KEY),
    ]);
    const [{ data: annData }, { data: matchData }] = await Promise.all([
      supabase.from('announcements').select('id, created_at'),
      supabase.from('matches').select('id, created_at'),
    ]);
    setAnnouncementsCount((annData ?? []).filter((a) => isNewItem(a.created_at, seenAnnAt, a.id, openedAnn)).length);
    setMatchesCount((matchData ?? []).filter((m) => isNewItem(m.created_at, seenMatchAt, m.id, openedMatch)).length);
  }, []);

  useEffect(() => {
    refresh();
    const sub = DeviceEventEmitter.addListener(BADGES_CHANGED_EVENT, refresh);
    return () => sub.remove();
  }, [refresh]);

  return { announcementsCount, matchesCount, refresh };
}

// Hook dla ekranów list (Ogłoszenia / Terminarz).
// Kropka pastylki zakładki gaśnie natychmiast po wejściu (seen_*_at = now przy enter()).
// Kropka pozycji gaśnie dopiero po jej otwarciu — dlatego "nowość" wiersza liczymy względem
// zamrożonego baseline (seen_*_at sprzed wejścia), a nie względem świeżo zapisanej wartości.
export function useItemBadges(kind: Kind) {
  const { seen: seenKey, opened: openedKey } = KEYS[kind];
  const [baselineSeenAt, setBaselineSeenAt] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const initedRef = useRef(false);

  const enter = useCallback(async () => {
    const [previousSeenAt, openedSet] = await Promise.all([AsyncStorage.getItem(seenKey), readSet(openedKey)]);
    setBaselineSeenAt(previousSeenAt);
    setOpened(openedSet);
    initedRef.current = true;
    try {
      await AsyncStorage.setItem(seenKey, new Date().toISOString());
    } catch (e) {
      console.error('Błąd zapisu znacznika przeczytania:', e);
    }
    DeviceEventEmitter.emit(BADGES_CHANGED_EVENT);
  }, [seenKey, openedKey]);

  const isNew = useCallback(
    (id: string, createdAt: string) => {
      if (!initedRef.current) return false;
      return isNewItem(createdAt, baselineSeenAt, id, opened);
    },
    [baselineSeenAt, opened]
  );

  const markOpened = useCallback(
    async (id: string) => {
      setOpened((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      await addToSet(openedKey, id);
      DeviceEventEmitter.emit(BADGES_CHANGED_EVENT);
    },
    [openedKey]
  );

  return { enter, isNew, markOpened };
}
