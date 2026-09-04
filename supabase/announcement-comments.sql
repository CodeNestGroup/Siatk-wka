-- ============================================================================
-- KOMENTARZE POD OGŁOSZENIAMI — nowa tabela announcement_comments
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne).
--
-- Co robi: tworzy tabelę na komentarze pod ogłoszeniami (dowolny zalogowany
-- użytkownik, admin i zwykły gracz, może dodać komentarz do dowolnego
-- ogłoszenia). Bez RLS — tak samo jak reszta tabel w tej appce (matches,
-- transactions, announcements...), bo cała appka i tak działa na kluczu anon
-- bez sesji Supabase Auth. To świadomie odłożone razem z resztą hardeningu
-- (patrz harden-anon-access.sql).
-- ============================================================================

create table if not exists public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid not null references public.players(id),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists announcement_comments_announcement_id_idx
  on public.announcement_comments (announcement_id);
