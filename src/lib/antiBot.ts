import { useCallback, useRef, useState } from 'react';

// Ochrona formularza rejestracji przed botami.
//
// WAŻNE ograniczenie: rejestracja w tej apce wywołuje Supabase bezpośrednio z telefonu kluczem
// anon, który jest publiczny (widoczny w każdym zbudowanym apk/ipa). Żadna weryfikacja
// wykonywana tylko po stronie klienta — ani ta, ani prawdziwa reCAPTCHA/hCaptcha/Turnstile bez
// dodatkowego sprawdzenia tokenu po stronie serwera — nie zatrzyma bota, który pomija
// interfejs i strzela zapytaniem prosto do Supabase REST. To realnie odstrasza zautomatyzowane
// boty klikające w samą aplikację (najczęstszy w praktyce przypadek), ale nie jest
// kryptograficznym zabezpieczeniem. Prawdziwa odporność wymaga bramki po stronie serwera
// (Edge Function albo RPC weryfikujący token Cloudflare Turnstile przed wstawieniem rekordu do
// players) — tak jak już robi to strona WWW klubu (esco-volleymanager.vercel.app).
//
// Trzy niezależne sygnały, każdy musi przejść:
// 1. Honeypot — niewidoczne dla człowieka pole; boty wypełniające każdy input w DOM/drzewie
//    komponentów zwykle je uzupełniają.
// 2. Czas wypełniania — człowiek nie wypełni całego formularza w mniej niż kilka sekund.
// 3. Cloudflare Turnstile (ten sam widget i klucz witryny co strona WWW klubu) — zastępuje
//    wcześniejszą prostą zagadkę matematyczną prawdziwym, rozpoznawalnym mechanizmem
//    weryfikacji "czy to człowiek", z tym samym wyglądem, do którego użytkownicy są przyzwyczajeni
//    ze strony internetowej.
const MIN_FILL_MS = 3000;

export function useHumanCheck() {
  const startedAtRef = useRef(Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Zmiana tego licznika remontuje <TurnstileWidget key={...}> (nowy WebView = nowe, jednorazowe
  // wyzwanie) — token Turnstile jest jednorazowy, więc po nieudanej próbie trzeba go odświeżyć.
  const [widgetResetKey, setWidgetResetKey] = useState(0);

  /** Resetuje stoper, honeypot i widget Turnstile — wywołuj po każdej nieudanej próbie. */
  const regenerate = useCallback(() => {
    startedAtRef.current = Date.now();
    setTurnstileToken(null);
    setWidgetResetKey((k) => k + 1);
  }, []);

  const verifyHuman = useCallback((): boolean => {
    if (honeypot.trim().length > 0) return false;
    if (Date.now() - startedAtRef.current < MIN_FILL_MS) return false;
    return !!turnstileToken;
  }, [honeypot, turnstileToken]);

  return { honeypot, setHoneypot, turnstileToken, setTurnstileToken, widgetResetKey, verifyHuman, regenerate };
}
