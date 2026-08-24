import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VolleyManager",
  description: "ESCO Volleyball Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
