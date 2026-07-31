"use client"

import { useState, useEffect } from "react"
import { User, Mail, Shield, Calendar, Trophy, Wallet, CheckCircle2, ArrowLeft } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUserData() {
      setLoading(true)
      const localUser = localStorage.getItem("volley_user")
      if (localUser) {
        setUser(JSON.parse(localUser))
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
      setLoading(false)
    }

    loadUserData()
  }, [])

  const displayName = user?.full_name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email) || "Użytkownik"
  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin"
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "MP"

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 lg:px-8">

          {/* Przycisk powrotu */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" />
            Powrót do pulpitu
          </Link>

          {/* Karta Profilowa ze szklanym gradientem */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple-500/5 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground font-bold text-2xl shadow-lg shadow-primary/25">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAdmin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                      {isAdmin ? "Administrator" : "Zawodnik ESCO"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="h-4 w-4 text-primary" />
                    {user?.email || "brak-emaila@esco.pl"}
                  </p>
                </div>
              </div>

              <Link href="/settings">
                <Button variant="outline" className="rounded-xl">
                  Edytuj konto
                </Button>
              </Link>
            </div>
          </div>

          {/* Kafelki Szybkich Statystyk Gracza */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Status w zespole</p>
                  <p className="text-lg font-bold text-foreground">Aktywny Gracz</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Bilans rozliczeń</p>
                  <p className="text-lg font-bold text-emerald-500">0 PLN (Czysto)</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Dołączono</p>
                  <p className="text-lg font-bold text-foreground">Sezon 2026</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dane Konta i Szczegóły */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3">Informacje systemowe</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/40">
                <span className="text-xs text-muted-foreground block">Identyfikator użytkownika</span>
                <span className="font-mono text-xs text-foreground mt-0.5 block">{user?.id || "local-user-id"}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/40">
                <span className="text-xs text-muted-foreground block">Rola w systemie VolleyManager</span>
                <span className="font-medium text-foreground mt-0.5 block">{isAdmin ? "Pełne uprawnienia (Admin)" : "Standardowe (Zawodnik)"}</span>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
