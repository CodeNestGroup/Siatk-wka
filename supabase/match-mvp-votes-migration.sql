-- ============================================================================
-- GŁOSOWANIE NA MVP MECZU — lekki, angażujący dodatek po zakończeniu spotkania
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne).
--
-- Kontekst: po zakończonym meczu gracze, którzy w nim grali, mogą zagłosować
-- na najlepszego zawodnika spotkania. Jeden głos na osobę na mecz (unikalne
-- ograniczenie na parę mecz+głosujący) — głosujący może zmienić zdanie, więc
-- zapis jest przez UPSERT (nadpisuje poprzedni głos tej samej osoby), a nie
-- zwykły INSERT. Wyniki widoczne od razu, bez czekania na jakiś termin.
-- ============================================================================

create table if not exists match_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  voter_id uuid not null references players(id) on delete cascade,
  voted_for_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, voter_id)
);

create index if not exists idx_match_mvp_votes_match_id on match_mvp_votes(match_id);

grant select, insert, update, delete on match_mvp_votes to anon, authenticated;
