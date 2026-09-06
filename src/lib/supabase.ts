import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Jedyny klient Supabase w apce. Autoryzacja jest wyłączona celowo — logowanie nie korzysta
// z Supabase Auth (patrz src/lib/player.ts), więc nie ma tu tokenu do trzymania/odświeżania.
// Wszystkie zapytania w całej aplikacji lecą kluczem anon; kontrolę dostępu robią wyłącznie
// funkcje RPC (verify_login, change_player_password) i uprawnienia po stronie bazy.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});