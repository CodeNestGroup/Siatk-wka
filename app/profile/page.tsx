"use client"

import { useState, useEffect } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import { User, Mail, Shield, Calendar, Trophy, Coffee, Heart, ArrowRight, IdCard } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

function perforation(color: string): React.CSSProperties {
  return { backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0 5px, transparent 5px 12px)` }
}

// Nominatiw, nie dopełniacz ("Sierpień 2026", nie "Sierpnia 2026") — miesiąc tu stoi sam,
// bez dnia przed sobą, więc gramatycznie to inny przypadek niż w hero na stronie głównej.
const MONTHS_NOMINATIVE_PL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"]

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Karta profilowa wcześniej pokazywała trzy kafelki na sztywno wpisane w kod ("Aktywny
  // Gracz", "0.00 PLN (Czysto)", "Sezon 2026") — żaden nie odzwierciedlał realnych danych.
  // Rozliczenia finansowe są teraz wstrzymane (patrz Ustawienia: "Rozliczenia i Wpisowe —
  // Wkrótce"), więc zamiast udawanego salda pokazujemy coś realnego: faktyczną liczbę
  // rozegranych meczów tego gracza.
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [playerStatusId, setPlayerStatusId] = useState<number | null>(null)
  const [playedMatchesCount, setPlayedMatchesCount] = useState<number | null>(null)

  useEffect(() => {
    async function loadUserData() {
      let activeUser: any = null
      const localUser = localStorage.getItem("volley_user")
      if (localUser) {
        activeUser = JSON.parse(localUser)
        setUser(activeUser)
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          activeUser = session.user
          setUser(activeUser)
        }
      }

      if (!activeUser?.id) return

      const [{ data: playerRow }, { data: regs }, { data: matches }] = await Promise.all([
        supabase.from("players").select("created_at, player_status_id").eq("id", activeUser.id).maybeSingle(),
        supabase.from("match_registrations").select("match_id").eq("player_id", activeUser.id),
        supabase.from("matches").select("id, date, status_id, is_settled")
      ])

      if (playerRow) {
        setJoinedAt(playerRow.created_at)
        setPlayerStatusId(playerRow.player_status_id)
      }

      // Ta sama definicja "faktycznie rozegrany" co na Statystykach (app/stats/page.tsx) —
      // odwołany mecz nigdy się nie liczy, reszta liczy się jeśli minęła data albo admin
      // ręcznie oznaczył go jako rozliczony/zakończony.
      const todayStr = new Date().toISOString().split("T")[0]
      const matchMap: Record<string, any> = {}
      matches?.forEach((m: any) => { matchMap[m.id] = m })

      const playedCount = (regs || []).filter((reg: any) => {
        const m = matchMap[reg.match_id]
        if (!m) return false
        if (m.status_id === 4) return false
        return m.date < todayStr || m.status_id === 3 || m.is_settled === true
      }).length

      setPlayedMatchesCount(playedCount)
    }

    loadUserData()
  }, [])

  async function handleLogout() {
    localStorage.removeItem("volley_user")
    sessionStorage.clear()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const displayName = user?.full_name || user?.name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email) || "Użytkownik"
  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin" || user?.role_id === 1
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "MP"

  // player_status_id bywa puste dla starszych/importowanych kont — tak samo jak w bazie
  // zawodników (app/players/page.tsx), brak wartości traktujemy jako "aktywny", nie "nieaktywny".
  const isActivePlayer = playerStatusId === 1 || playerStatusId === null
  const joinedLabel = (() => {
    if (!joinedAt) return "—"
    const d = new Date(joinedAt)
    if (Number.isNaN(d.getTime())) return "—"
    return `${MONTHS_NOMINATIVE_PL[d.getMonth()]} ${d.getFullYear()}`
  })()

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] text-[#14181F]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(640px circle at 10% -8%, rgba(44,75,255,0.07), transparent 60%), radial-gradient(520px circle at 92% 16%, rgba(255,210,63,0.10), transparent 55%), radial-gradient(760px circle at 45% 100%, rgba(0,196,140,0.05), transparent 60%)"
          }}
        />

        {/* NAGŁÓWEK — ten sam wzorzec co reszta appki */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 pl-16 pr-6 py-3 lg:px-6 backdrop-blur-md shrink-0">
          <div className="flex-1 flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120]">
              <Coffee className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>

            <p className="text-xs font-medium text-slate-500 truncate">
              Podoba Ci się nasza inicjatywa? <strong className="text-slate-700 font-semibold">Postaw kawę organizatorom lub wesprzyj rozwój projektu!</strong>
            </p>

            <button
              onClick={() => setShowSupportModal(true)}
              className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#0B1120] hover:bg-[#1A2340] text-white font-bold text-xs px-4 py-2 shadow-sm transition-all cursor-pointer active:scale-[0.97] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF] focus-visible:ring-offset-2"
            >
              <Heart className="h-3.5 w-3.5 fill-[#FFD23F] text-[#FFD23F]" />
              Postaw kawę
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto pl-4">
            <button
              onClick={() => setShowSupportModal(true)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>

            <NotificationsBell onNotificationClick={() => {}} />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 pb-24 lg:px-8 lg:pb-8">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Profil Użytkownika</h1>
              <p className="text-xs text-slate-500 font-medium">Podgląd Twoich danych osobowych oraz statusu w zespole.</p>
            </div>
          </div>

          {/* KARTA PROFILOWA — bilet w stylistyce "Under the Lights" */}
          <div
            className="relative overflow-hidden rounded-[28px] text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
            style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
          >
            <div className="absolute inset-0 pointer-events-none" style={netPattern} />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2C4BFF]/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#FFD23F]/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <div className="flex items-center gap-5">
                <div className={cn(score.className, "flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-white font-semibold text-2xl")}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2C4BFF]/20 border border-[#2C4BFF]/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#8FA1FF]">
                      <IdCard className="h-3 w-3 text-[#FFD23F]" />
                      {isAdmin ? "Administrator" : "Zawodnik ESCO"}
                    </span>
                  </div>
                  <h2 className={cn(display.className, "text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5 truncate")}>{displayName}</h2>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mt-2">
                    <Mail className="h-3.5 w-3.5 text-[#FFD23F]" />
                    {user?.email || "brak-emaila@esco.pl"}
                  </p>
                </div>
              </div>

              <div className="hidden lg:block relative w-px self-stretch">
                <div className="absolute inset-0" style={perforation("rgba(255,255,255,0.28)")} />
              </div>

              <div className="border-t lg:border-t-0 border-white/10 pt-5 lg:pt-0">
                <Link href="/settings">
                  <Button className="w-full sm:w-auto rounded-2xl bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white font-black text-xs gap-2 px-6 py-3.5 shadow-lg shadow-[#2C4BFF]/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#FFD23F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]">
                    Edytuj konto
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* KAFELKI SZYBKICH STATYSTYK — wszystkie trzy wcześniej były wpisane w kod na
              sztywno (nigdy się nie zmieniały bez względu na realny stan konta); teraz liczone
              z bazy. "Bilans rozliczeń" zniknął całkiem — rozliczenia finansowe są wstrzymane
              (patrz Ustawienia), więc pokazywanie kwoty tutaj byłoby mylące. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", isActivePlayer ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/20" : "bg-slate-100 text-slate-400 border-slate-200")}>
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status w zespole</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{isActivePlayer ? "Aktywny Gracz" : "Nieaktywny"}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2C4BFF]/10 text-[#2C4BFF] border border-[#2C4BFF]/20">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rozegrane mecze</p>
                <p className={cn(score.className, "text-sm font-semibold text-slate-900 mt-0.5")}>
                  {playedMatchesCount === null ? "…" : playedMatchesCount} w tym sezonie
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7A5CFF]/10 text-[#7A5CFF] border border-[#7A5CFF]/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dołączono</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{joinedLabel}</p>
              </div>
            </div>
          </div>

          {/* INFORMACJE SYSTEMOWE */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
              <Shield className="h-3.5 w-3.5 text-slate-300" />
              Informacje systemowe
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Surowy UUID to czysty szum na telefonie — nikt go tam nie odczytuje ani nie
                  kopiuje z małego ekranu. Zostaje widoczny od sm: wzwyż, gdzie i tak jest miejsce. */}
              <div className="hidden sm:block p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-bold block mb-0.5">Identyfikator użytkownika</span>
                <span className="font-mono text-slate-900 font-bold block truncate">{user?.id || "local-user-id"}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-bold block mb-0.5">Rola w systemie ESCO VolleyManager</span>
                <span className="font-bold text-slate-900 block">{isAdmin ? "Pełne uprawnienia (Administrator)" : "Standardowe (Zawodnik)"}</span>
              </div>
            </div>
          </div>

        </main>
      </div>

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  )
}
