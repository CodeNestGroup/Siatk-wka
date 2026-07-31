"use client"

import { useState } from "react"
import { Volleyball, Lock, Mail, ArrowRight, ShieldCheck, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

type LoginFormProps = {
  onLoginSuccess?: () => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    // Domyślne szybkie logowanie deweloperskie / demo
    if (email === "admin@admin.pl" && password === "admin") {
      const mockAdmin = { email: "admin@admin.pl", full_name: "Mateusz Podzorski", role: "admin" }
      localStorage.setItem("volley_user", JSON.stringify(mockAdmin))
      if (onLoginSuccess) onLoginSuccess()
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg("Nieprawidłowy e-mail lub hasło.")
    } else {
      if (onLoginSuccess) onLoginSuccess()
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">

      {/* Tło dekoracyjne */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">

        {/* Logo i Tytuł */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Volleyball className="h-8 w-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">VolleyManager</h1>
          <p className="text-xs text-muted-foreground">System Zarządzania Drużyną Siatkarską</p>
        </div>

        {/* Formularz */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Adres E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className="w-full rounded-xl border border-input bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Hasło</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-500 font-semibold text-center">{errorMsg}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 font-bold gap-2">
            {loading ? "Logowanie..." : "Zaloguj się do panelu"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {/* Sekcja Sponsorów na dole ekranu logowania */}
        <div className="border-t border-border/60 pt-4 text-center space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
            <Award className="h-3 w-3 text-amber-400" />
            Oficjalni Sponsorzy Drużyny
          </p>
          <div className="flex items-center justify-center gap-3 text-xs font-bold text-muted-foreground/80 flex-wrap">
            <span className="hover:text-primary transition-colors">ESCO Jaworze</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors">Beskid Sport</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors">VolleyStore</span>
          </div>
        </div>

      </div>
    </div>
  )
}
