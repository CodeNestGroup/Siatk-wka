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
