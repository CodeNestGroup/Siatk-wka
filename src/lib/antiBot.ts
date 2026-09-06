import { useCallback, useRef, useState } from 'react';

// Prosta, w pełni lokalna (bez zewnętrznych usług) ochrona formularza rejestracji przed botami.
//
// WAŻNE ograniczenie: rejestracja w tej apce wywołuje Supabase bezpośrednio z telefonu kluczem
// anon, który jest publiczny (widoczny w każdym zbudowanym apk/ipa). Żadna weryfikacja
// wykonywana tylko po stronie klienta — ani ta, ani prawdziwa reCAPTCHA/hCaptcha bez
// dodatkowego sprawdzenia tokenu po stronie serwera — nie zatrzyma bota, który pomija
// interfejs i strzela zapytaniem prosto do Supabase REST. To realnie odstrasza zautomatyzowane
// boty klikające w samą aplikację (najczęstszy w praktyce przypadek), ale nie jest
// kryptograficznym zabezpieczeniem. Prawdziwa odporność wymaga bramki po stronie serwera
// (Edge Function albo RPC weryfikujący token np. Google reCAPTCHA/hCaptcha/Cloudflare Turnstile
// przed wstawieniem rekordu do players) — patrz notatka w INSTRUKCJA-WDROZENIA / opis w czacie.
//
// Trzy niezależne sygnały, każdy musi przejść:
// 1. Honeypot — niewidoczne dla człowieka pole; boty wypełniające każdy input w DOM/drzewie
//    komponentów zwykle je uzupełniają.
// 2. Czas wypełniania — człowiek nie wypełni całego formularza w mniej niż kilka sekund.
// 3. Losowe działanie arytmetyczne — trzeba je policzyć, a nie tylko odczytać/skopiować
//    (w przeciwieństwie do poprzedniego "przepisz kod z obrazka", które dało się odczytać
//    wprost ze stanu komponentu albo zeskrobać jako zwykły tekst).
const MIN_FILL_MS = 3000;

function randomOperand(): number {
  return 1 + Math.floor(Math.random() * 8);
}

export function useHumanCheck() {
  const startedAtRef = useRef(Date.now());
  const [a, setA] = useState(randomOperand);
  const [b, setB] = useState(randomOperand);
  const [honeypot, setHoneypot] = useState('');
  const [answer, setAnswer] = useState('');

  /** Losuje nowe działanie i resetuje stoper — wywołuj po każdej nieudanej próbie. */
  const regenerate = useCallback(() => {
    startedAtRef.current = Date.now();
    setA(randomOperand());
    setB(randomOperand());
    setAnswer('');
  }, []);

  const verifyHuman = useCallback((): boolean => {
    if (honeypot.trim().length > 0) return false;
    if (Date.now() - startedAtRef.current < MIN_FILL_MS) return false;
    return Number(answer.trim()) === a + b;
  }, [honeypot, answer, a, b]);

  return { a, b, honeypot, setHoneypot, answer, setAnswer, verifyHuman, regenerate };
}
