-- ============================================================================
-- SEZONY — możliwość zakończenia sezonu i porównywania statystyk między sezonami
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne).
--
-- Kontekst: do tej pory wszystkie mecze to była jedna ciągła pula — Statystyki
-- (/stats) liczyły wszystko od początku istnienia klubu naraz, bez możliwości
-- "zamknięcia" bieżącego okresu i porównania go z kolejnym. Ta migracja:
--   1. Tabela `seasons` — `closed_at is null` oznacza sezon AKTYWNY (dokładnie
--      jeden taki na raz w normalnym użyciu appki, choć baza tego nie wymusza
--      twardo). Zamknięcie sezonu = ustawienie `closed_at`, appka wtedy sama
--      zakłada nowy aktywny sezon (patrz "Zakończ sezon" na /stats).
--   2. Backfill jednym sezonem obejmującym WSZYSTKIE dotychczasowe mecze —
--      żeby zamiast "historia zaczyna się teraz" appka od razu pokazywała
--      pełną dotychczasową historię jako pierwszy, zamykalny sezon.
--   3. Kolumna `matches.season_id` — nowe mecze (app/page.tsx: handleCreateMatch)
--      dostają ją automatycznie, wskazując na aktualnie aktywny sezon.
-- ============================================================================

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at date not null default current_date,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_seasons_closed_at on seasons(closed_at);

-- Jeden sezon startowy obejmujący całą dotychczasową historię — tylko jeśli tabela
-- jest jeszcze pusta (nie nadpisuje niczego przy ponownym uruchomieniu tej migracji).
-- `coalesce` zabezpiecza przypadek pustej tabeli `matches` (świeża instalacja appki).
insert into seasons (name, started_at)
select
  coalesce('Sezon ' || to_char(min(date), 'YYYY'), 'Sezon 1'),
  coalesce(min(date), current_date)
from matches
where not exists (select 1 from seasons);

alter table matches add column if not exists season_id uuid references seasons(id) on delete set null;

-- Wszystkie mecze bez przypisanego sezonu (czyli w praktyce: wszystkie sprzed tej
-- migracji) trafiają do najstarszego sezonu — tego utworzonego backfillem wyżej.
update matches
set season_id = (select id from seasons order by started_at asc limit 1)
where season_id is null;

grant select, insert, update, delete on seasons to anon, authenticated;
