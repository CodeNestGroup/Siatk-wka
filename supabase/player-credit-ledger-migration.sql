-- ============================================================================
-- NADPŁATY GRACZY — realny mechanizm depozytu za zaliczkowe wpłaty gotówkowe
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne).
--
-- Kontekst: gracze płacą na hali gotówką do ręki osobie zbierającej. Część
-- z nich chce zapłacić z góry za wiele przyszłych spotkań naraz (np. "300 zł
-- za najbliższe 12 meczów"), zamiast płacić przy każdym z osobna. Do tej pory
-- "Nadpłaty Graczy" w Finansach to była czysta atrapa — czytała z widoku
-- `player_balances`, który nigdzie nie był zasilany żadnym zapisem.
--
-- Co robi ta migracja:
--   1. Tabela `player_credit_ledger` — księga zapisów depozytu gracza.
--      Dodatnia kwota = doładowanie (gracz wpłacił gotówkę z góry),
--      ujemna = zużycie (pokryto nią wpisowe za konkretny mecz). Trzymamy
--      pełną historię (append-only), a nie jedną nadpisywaną kolumnę
--      `balance` — łatwiej to audytować i nie ma ryzyka wyścigu przy
--      równoczesnych zapisach.
--   2. Widok `player_balances` (id, name, balance) — DOKŁADNIE ten kształt,
--      którego już oczekuje istniejący kod appki (`getPlayerBalances()` w
--      lib/data.ts, sekcja "Nadpłaty Zawodników" w Finansach). Appka nie
--      wymaga żadnej zmiany, żeby zacząć pokazywać realne dane — wystarczy,
--      że w tabeli pojawią się wiersze.
--   3. Kolumna `match_registrations.paid_from_credit` — rozróżnia "opłacone
--      świeżą gotówką na hali za TEN mecz" (ma się liczyć do rozliczenia w
--      Finansach przy tym meczu) od "opłacone z wcześniej wpłaconego depozytu"
--      (gotówka za to wpisowe wpłynęła do kasy klubu już wcześniej, przy
--      doładowaniu — więc PRZY ROZLICZANIU TEGO MECZU nie może zostać
--      policzona jeszcze raz, bo zdublowałoby to wpływy w kasie klubu).
-- ============================================================================

create table if not exists player_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  amount numeric not null,
  reason text,
  match_id uuid references matches(id) on delete set null,
  created_by uuid references players(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_player_credit_ledger_player_id on player_credit_ledger(player_id);

-- `player_balances` już istnieje w tej bazie jako zwykła TABELA (nie widok) — stąd błąd
-- 42809 przy pierwszej próbie uruchomienia tej migracji ("player_balances is not a view").
-- Sprawdzone przed dodaniem tej linii: tabela jest całkowicie pusta (zero wierszy) i żaden
-- fragment kodu appki nigdy do niej nie zapisywał — to martwa pozostałość, bezpieczna do
-- zastąpienia widokiem o tym samym kształcie (id, name, balance).
drop table if exists player_balances;

create or replace view player_balances as
select
  p.id,
  p.full_name as name,
  coalesce(sum(l.amount), 0) as balance
from players p
join player_credit_ledger l on l.player_id = p.id
group by p.id, p.full_name;

alter table match_registrations add column if not exists paid_from_credit boolean not null default false;

grant select, insert, update, delete on player_credit_ledger to anon, authenticated;
grant select on player_balances to anon, authenticated;
