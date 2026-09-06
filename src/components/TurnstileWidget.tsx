import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Palette } from '@/constants/app-theme';

// Klucz witryny (publiczny — bezpieczny do umieszczenia w kodzie klienckim, w przeciwieństwie do
// tajnego klucza serwerowego) tej samej strony esco-volleymanager.vercel.app, żeby użytkownik
// widział dokładnie ten sam mechanizm weryfikacji co na stronie WWW klubu.
const SITE_KEY = '0x4AAAAAAEJKrr0toLK0qeAv';
// Turnstile sprawdza po stronie klienta, czy hostname strony pasuje do domen skonfigurowanych
// dla klucza witryny — `baseUrl` każe WebView zgłaszać ten origin zamiast pustego/lokalnego,
// dzięki czemu widget faktycznie się renderuje zamiast zgłaszać błąd nieznanej domeny.
const SITE_ORIGIN = 'https://esco-volleymanager.vercel.app';

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { display: flex; align-items: center; justify-content: center; min-height: 70px; }
</style>
</head>
<body>
  <div class="cf-turnstile"
    data-sitekey="${SITE_KEY}"
    data-callback="onTurnstileSuccess"
    data-error-callback="onTurnstileError"
    data-expired-callback="onTurnstileExpired"
  ></div>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    function onTurnstileSuccess(token) { post({ type: 'success', token: token }); }
    function onTurnstileError() { post({ type: 'error' }); }
    function onTurnstileExpired() { post({ type: 'expired' }); }
  </script>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</body>
</html>`;

type Props = {
  onToken: (token: string | null) => void;
  c: Palette;
};

// Weryfikacja "czy to człowiek" w rejestracji — ten sam widget Cloudflare Turnstile co na
// stronie WWW klubu, osadzony przez WebView (Turnstile to widget webowy, nie ma natywnego SDK
// dla React Native). Sam token nie jest tu w żaden sposób sprawdzany po stronie serwera
// (patrz komentarz w src/lib/antiBot.ts) — podnosi to jednak poprzeczkę wyżej niż prosta
// zagadka matematyczna i ujednolica wygląd z rejestracją na stronie internetowej.
export default function TurnstileWidget({ onToken, c }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.wrap, { borderColor: c.line, backgroundColor: c.card2 }]}>
      {!loaded && Platform.OS !== 'web' && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator color={c.ink3} />
        </View>
      )}
      <WebView
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: SITE_ORIGIN }}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
        onLoadEnd={() => setLoaded(true)}
        onMessage={(e: WebViewMessageEvent) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            onToken(data.type === 'success' && typeof data.token === 'string' ? data.token : null);
          } catch {
            onToken(null);
          }
        }}
        javaScriptEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 76, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  webview: { flex: 1 },
  webviewContainer: { backgroundColor: 'transparent' },
  loaderOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
