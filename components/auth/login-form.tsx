"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanIdentifier = identifier.trim().toLowerCase()

    // 1. Sprawdzanie czy to admin
    if (cleanIdentifier === "admin" || cleanIdentifier === "admin@admin.pl") {
      const { error } = await supabase.auth.signInWithPassword({
        email: "admin@admin.pl",
        password,
      })
      if (error) {
        setError("Błędne hasło administratora.")
        setLoading(false)
      } else {
        onLoginSuccess()
      }
      return
    }

    // 2. Dla zwykłego gracza: sprawdzamy czy istnieje w tabeli players po e-mailu lub części imienia/nazwiska
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('*')
      .or(`email.eq.${cleanIdentifier},full_name.ilike.%${cleanIdentifier}%`)
      .single()

    if (playerError || !playerData) {
      setError("Nie znaleziono takiego zawodnika w bazie.")
      setLoading(false)
      return
    }

    // Jeśli hasło to domyślne "haslo123", logujemy pomyślnie
    if (password === "haslo123") {
      // Zapisujemy w localStorage informację o zalogowanym graczu
      localStorage.setItem("volley_user", JSON.stringify(playerData))
      onLoginSuccess()
    } else {
      setError("Błędne hasło (domyślne to: haslo123).")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border space-y-4">
        <h2 className="text-xl font-bold text-foreground text-center">Logowanie do Systemu Meczów</h2>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Login / Email zawodnika</label>
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="np. maciej.maciej@onet.eu lub imię"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Hasło</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logowanie..." : "Zaloguj się"}
        </Button>
      </form>
    </div>
  )
}
