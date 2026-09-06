/**
 * Root layout Next.js (App Router)
 *
 * Co to jest: główny layout całej apki — jedyne miejsce, które renderuje <html>/<body>;
 * wszystkie podstrony (pliki page.tsx w katalogu app) trafiają tu jako `children`.
 * Eksportuje / robi: `metadata`/`viewport` (meta tagi, w tym ustawienia PWA na iOS — pełny
 * ekran, pasek statusu, safe-area) oraz domyślny komponent `RootLayout`, który montuje globalny
 * CSS i `ServiceWorkerRegister`.
 * Używany przez: Next.js automatycznie, dla każdej strony w app/.
 * Uwagi: ustawienia `appleWebApp`/`other`/`viewportFit` są tu nieoczywiste i celowo dobrane
 * pod PWA na iOS — patrz komentarze przy poszczególnych polach niżej, usunięcie ich cofnie
 * appkę dodaną do ekranu głównego do zwykłej karty Safari.
 */
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"

export const metadata: Metadata = {
  title: "ESCO VolleyManager",
  description: "Menadżer lokalnej siatkówki",
  manifest: "/manifest.webmanifest",
  // Bez tego iOS otwiera appkę dodaną do ekranu głównego w zwykłej karcie Safari
  // (z paskiem adresu) zamiast na pełnym ekranie jak prawdziwa appka.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VolleyManager",
  },
  // Next.js sam dopisuje nowoczesny "mobile-web-app-capable", ale starsze Safari na iOS
  // rozpoznaje wyłącznie ten prefiksowany — bez niego appka dodana do ekranu głównego
  // otwierałaby się w zwykłej karcie z paskiem adresu zamiast na pełnym ekranie.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  themeColor: "#0B1120",
  // Bez tego env(safe-area-inset-bottom) zawsze zwraca 0 — a to jedyny sposób, żeby nowy
  // pasek nawigacji na dole (components/dashboard/sidebar.tsx) nie chował się pod paskiem
  // gestów/Home Indicator na iPhone'ach z wcięciem.
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
