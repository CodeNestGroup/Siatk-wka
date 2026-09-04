-- ============================================================================
-- POWIADOMIENIA — subskrypcje push (telefon/desktop) + trwałe "przeczytane"
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne).
--
-- Co robi:
--   1. push_subscriptions — jedna subskrypcja Web Push na jedno zalogowane
--      urządzenie/przeglądarkę (endpoint jest unikalny per przeglądarka).
--      Gdy admin doda mecz/ogłoszenie/wpłatę, appka woła każdą zapisaną
--      subskrypcję i przeglądarka/telefon pokazuje prawdziwe powiadomienie
--      systemowe — nawet gdy appka jest zamknięta.
--   2. notification_reads — zastępuje localStorage ("volley_read_matches" itp.)
--      jako miejsce, gdzie appka pamięta co już widziałeś. Wcześniej ta lista
--      żyła tylko w jednej przeglądarce, więc telefon i komputer miały osobne,
--      niezsynchronizowane liczniki, a wyczyszczenie danych przeglądarki
--      cofało wszystko do "nieprzeczytane". Teraz to jeden wspólny stan w bazie.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_player_id_idx
  on public.push_subscriptions (player_id);

create table if not exists public.notification_reads (
  player_id uuid not null references public.players(id) on delete cascade,
  item_key text not null,
  read_at timestamptz not null default now(),
  primary key (player_id, item_key)
);
