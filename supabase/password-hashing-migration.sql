-- ============================================================================
-- KRYTYCZNA POPRAWKA BEZPIECZEŃSTWA — hashowanie haseł zawodników
-- ============================================================================
-- Jak uruchomić: Supabase Dashboard -> SQL Editor -> wklej całość -> Run.
-- Bezpieczne do uruchomienia więcej niż raz (idempotentne).
--
-- Co robi:
--   1. Włącza pgcrypto (bcrypt wbudowany w Postgres).
--   2. Dodaje trigger, który automatycznie hashuje KAŻDE hasło zapisane do
--      players.password (rejestracja, dodanie gracza przez admina, zmiana
--      hasła) — więc żadna dotychczasowa ścieżka w kodzie nie musi się o to
--      martwić, nawet jeśli kiedyś ktoś doda kolejną.
--   3. Jednorazowo hashuje hasła, które już dziś leżą w bazie jawnym tekstem.
--   4. Dodaje dwie funkcje (RPC), przez które appka loguje i zmienia hasło —
--      dzięki `security definer` przeglądarka nigdy nie musi pobierać ani
--      porównywać hasła/hasha samodzielnie.
--
-- Czego ta migracja NIE robi (świadomie, żeby nic dziś nie popsuć):
--   Nie blokuje odczytu kolumny `password` publicznym kluczem anon — appka
--   w wielu miejscach robi `select("*")` na tabeli `players` (lista graczy,
--   panel admina, statystyki) i zablokowanie kolumny zepsułoby te zapytania
--   w całości. Realny efekt tej migracji: kolumna zamiast hasła w czystym
--   tekście trzyma bcrypt-hash — nie do odwrócenia, bezużyteczny bez
--   łamania offline. To ogromna redukcja ryzyka, ale nie jest to pełne
--   zamknięcie tematu. Docelowo: przenieść wszystkie odczyty `players` na
--   jawną listę kolumn (bez password) i dopiero wtedy zablokować kolumnę
--   całkowicie — albo, lepiej, przejść na prawdziwe Supabase Auth.
-- ============================================================================

create extension if not exists pgcrypto;

create or replace function hash_player_password()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.password is not null and new.password !~ '^\$2[aby]\$' then
    new.password := extensions.crypt(new.password::text, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hash_player_password on players;
create trigger trg_hash_player_password
before insert or update of password on players
for each row
execute function hash_player_password();

-- Jednorazowe przehashowanie tego, co dziś leży w bazie jawnym tekstem.
update players
set password = extensions.crypt(password::text, extensions.gen_salt('bf'))
where password is not null and password !~ '^\$2[aby]\$';

-- Logowanie: appka wysyła e-mail + hasło, porównanie dzieje się W CAŁOŚCI
-- wewnątrz Postgresa. Przeglądarka nigdy nie widzi hasha.
create or replace function verify_login(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_player players%rowtype;
begin
  select * into v_player from players where email = lower(trim(p_email));

  if v_player.id is null then
    return json_build_object('error', 'not_found');
  end if;

  if v_player.password is null or extensions.crypt(p_password::text, v_player.password::text) <> v_player.password::text then
    return json_build_object('error', 'wrong_password');
  end if;

  if v_player.role_id = 3 then
    return json_build_object('error', 'pending');
  end if;

  return json_build_object(
    'id', v_player.id,
    'full_name', v_player.full_name,
    'email', v_player.email,
    'phone', v_player.phone,
    'role_id', v_player.role_id
  );
end;
$$;

-- Zmiana hasła w Ustawieniach — hasło i tak zostanie zahashowane przez
-- trigger powyżej, ta funkcja istnieje głównie po to, żeby w przyszłości
-- dało się odciąć bezpośredni UPDATE tej kolumny dla klucza anon.
create or replace function set_player_password(p_player_id uuid, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update players set password = p_new_password where id = p_player_id;
end;
$$;

grant execute on function verify_login(text, text) to anon, authenticated;
grant execute on function set_player_password(uuid, text) to anon, authenticated;
