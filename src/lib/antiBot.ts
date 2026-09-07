import { useCallback, useRef, useState } from 'react';

// Ochrona formularza rejestracji przed botami.
//
// WAŻNE ograniczenie: rejestracja w tej apce wywołuje Supabase bezpośrednio z telefonu kluczem
// anon, który jest publiczny (widoczny w każdym zbudowanym apk/ipa). Żadna weryfikacja
// wykonywana tylko po stronie klienta nie zatrzyma bota, który pomija interfejs i strzela
// zapytaniem prosto do Supabase REST. To realnie odstrasza zautomatyzowane boty klikające w samą
// aplikację (najczęstszy w praktyce przypadek), ale nie jest kryptograficznym zabezpieczeniem.
// Prawdziwa odporność wymagałaby bramki po stronie serwera (Edge Function) przed wstawieniem
// rekordu do players.
//
// Cloudflare Turnstile (widget webowy w WebView) był tu wcześniej, ale w praktyce na realnych
// telefonach regularnie zgłaszał błąd — zależność od zewnętrznej domeny, klucza witryny i
// renderowania stron trzecich w WebView okazała się zbyt zawodna. Zastąpiony w pełni natywnym,
// lokalnym mechanizmem "przesuń, aby potwierdzić" (SliderCaptcha) — bez sieci, więc nie może się
// wysypać z przyczyn od nas niezależnych.
//
// Trzy niezależne sygnały, każdy musi przejść:
// 1. Honeypot — niewidoczne dla człowieka pole; boty wypełniające każdy input w DOM/drzewie
//    komponentów zwykle je uzupełniają.
// 2. Czas wypełniania — człowiek nie wypełni całego formularza w mniej niż kilka sekund.
// 3. Slider "przesuń, aby potwierdzić" — wymaga gestu przeciągnięcia do końca toru, więc nie
//    przechodzi go zwykłe programowe wypełnienie i wysłanie formularza.
const MIN_FILL_MS = 3000;

export function useHumanCheck() {
  const startedAtRef = useRef(Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [sliderVerified, setSliderVerified] = useState(false);
  // Zmiana tego licznika remontuje <SliderCaptcha key={...}>, cofając suwak na start —
  // wywoływane po każdej nieudanej próbie rejestracji.
  const [widgetResetKey, setWidgetResetKey] = useState(0);

  /** Resetuje stoper, honeypot i suwak — wywołuj po każdej nieudanej próbie. */
  const regenerate = useCallback(() => {
    startedAtRef.current = Date.now();
    setSliderVerified(false);
    setWidgetResetKey((k) => k + 1);
  }, []);

  const verifyHuman = useCallback((): boolean => {
    if (honeypot.trim().length > 0) return false;
    if (Date.now() - startedAtRef.current < MIN_FILL_MS) return false;
    return sliderVerified;
  }, [honeypot, sliderVerified]);

  return { honeypot, setHoneypot, sliderVerified, setSliderVerified, widgetResetKey, verifyHuman, regenerate };
}
