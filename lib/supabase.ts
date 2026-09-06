/**
 * Klient Supabase
 *
 * Co to jest: inicjalizacja jedynego klienta Supabase w całej apce.
 * Eksportuje / robi: `supabase` — klient utworzony kluczem `anon` (publicznym), gotowy do importu wszędzie.
 * Używany przez: dosłownie każdy plik w apce, który czyta/zapisuje dane w bazie (lib/data.ts, RPC logowania, API routes push itd.).
 * Uwagi: apka NIE używa Supabase Auth — cała autoryzacja jest własna (RPC `verify_login`/`set_player_password`,
 * sesja w localStorage pod kluczem `volley_user`). Klucz `anon` oznacza, że reguły dostępu trzeba pilnować
 * po stronie RLS w bazie, nie tutaj.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
