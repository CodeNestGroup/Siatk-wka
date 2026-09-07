-- ============================================================================
-- WŁĄCZENIE REALTIME — kropki/dzwoneczek na żywo bez odświeżania strony
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne — sprawdza czy tabela
-- już jest w publikacji, zanim spróbuje ją dodać).
--
-- Kontekst: components/dashboard/sidebar.tsx od dawna subskrybuje zmiany na
-- żywo (Supabase Realtime, kanał "sidebar-badges") w czterech tabelach —
-- matches, transactions, players, announcements — żeby czerwone kropki przy
-- zakładkach i dzwoneczek powiadomień aktualizowały się natychmiast, gdy ktoś
-- inny doda mecz/wpłatę/ogłoszenie albo zarejestruje nowe konto. Kod appki był
-- gotowy od dawna, ale bez włączonej Replication w Supabase (ustawienie na
-- poziomie bazy, nie coś co da się przełączyć z poziomu kodu ani kluczem anon)
-- Realtime milczy — appka i tak działa, kropki po prostu doganiają stan dopiero
-- przy nawigacji/odświeżeniu, a nie "na żywo" w tle.
--
-- WAŻNE — czego to NIE robi: to włącza realtime tylko dla mechanizmu odznak/
-- dzwoneczka. Same listy (harmonogram meczów, księga w Finansach, tablica
-- ogłoszeń) nadal wymagają odświeżenia strony, żeby pokazać zmiany zrobione
-- przez kogoś innego — żadna z tych stron nie subskrybuje osobno danych,
-- tylko reaguje na globalny sygnał "coś się zmieniło" pod kątem liczników.
-- Rozszerzenie realtime na same listy to osobna, większa zmiana w kodzie.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;

-- Kontrola po uruchomieniu — powinno pokazać 4 wiersze (matches, transactions,
-- players, announcements) w wynikach.
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
