"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  Calendar,
  Users,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  X,
  ChevronDown,
  Menu,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { fetchReadKeys, markKeysRead } from "@/lib/notifications"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co w dashboardzie ("Under the Lights"). Docelowo warto
// wynieść display/score do wspólnego /lib/fonts.ts, żeby nie inicjować
// fontów po raz drugi — na razie zostawiam lokalnie dla samowystarczalności pliku.
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 16px)"
}

type SidebarProps = {
  open?: boolean
  onClose?: () => void
  user?: any
  onLogout?: () => void
}

export function Sidebar({ open: openProp, onClose, user, onLogout }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  // Stan otwarcia na mobile trzymany LOKALNIE w sidebarze (nie tylko przez prop `open` z rodzica) —
  // żadna z 7 stron korzystających z tego komponentu nigdy nie wołała `setSidebarOpen(true)`, więc
  // sidebar dawał się tylko zamknąć, nigdy otworzyć. Pływający przycisk menu niżej to naprawia
  // od razu wszędzie, bez dotykania każdej strony z osobna.
  const [mobileOpen, setMobileOpen] = useState(false)
  const isOpen = !!openProp || mobileOpen

  const [unreadMatches, setUnreadMatches] = useState(false)
  const [unreadPlayers, setUnreadPlayers] = useState(false)
  const [unreadFinances, setUnreadFinances] = useState(false)
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(false)

  function closeSidebar() {
    setMobileOpen(false)
    onClose?.()
  }

  // "Przeczytane" żyje w bazie (notification_reads), nie w localStorage — patrz
  // lib/notifications.ts. Wcześniej te same klucze co dzwoneczek trzymał osobno tu
  // (volley_read_matches itp.), więc telefon i komputer miały niezsynchronizowane
  // kropki, a wyczyszczenie danych przeglądarki cofało wszystko do "nieprzeczytane".
  const checkUnreadBadges = useCallback(async () => {
    if (!user?.id) return
    const readKeys = await fetchReadKeys(user.id)

    // 1. MECZE
    if (pathname === "/") {
      setUnreadMatches(false)
    } else {
      const { data: matches } = await supabase.from("matches").select("id").limit(50).order("created_at", { ascending: false })
      setUnreadMatches(!!matches?.some(m => !readKeys.has(`match-${m.id}`)))
    }

    // 2. ZAWODNICY
    if (pathname === "/players") {
      setUnreadPlayers(false)
    } else {
      const { data: pending } = await supabase.from("players").select("id").or("player_status_id.eq.3,role_id.eq.3")
      setUnreadPlayers(!!pending?.some(p => !readKeys.has(`player-${p.id}`)))
    }

    // 3. FINANSE
    if (pathname === "/finances") {
      setUnreadFinances(false)
    } else {
      const { data: txs } = await supabase.from("transactions").select("id").limit(50).order("created_at", { ascending: false })
      setUnreadFinances(!!txs?.some(t => !readKeys.has(`tx-${t.id}`)))
    }

    // 4. OGŁOSZENIA
    if (pathname === "/announcements") {
      setUnreadAnnouncements(false)
    } else {
      const { data: announcements } = await supabase.from("announcements").select("id").limit(50).order("created_at", { ascending: false })
      setUnreadAnnouncements(!!announcements?.some(a => !readKeys.has(`announcement-${a.id}`)))
    }
  }, [pathname, user?.id])

  useEffect(() => {
    checkUnreadBadges()
    window.addEventListener("update-badges", checkUnreadBadges)
    return () => {
      window.removeEventListener("update-badges", checkUnreadBadges)
    }
  }, [checkUnreadBadges])

  // Nasłuch na żywo (Supabase Realtime) — gdy ktoś inny doda mecz, wpłatę, ogłoszenie albo
  // zgłosi się jako nowy zawodnik, wszyscy podłączeni klienci od razu przeliczają kropki/
  // dzwonek, bez przeładowania strony. Wymaga włączonej Replication dla tabel matches/
  // transactions/players/announcements w Supabase — jeśli jest wyłączona, kropki i tak się
  // zaktualizują (przy nawigacji / co jakiś czas), po prostu nie "na żywo" bez odświeżenia.
  useEffect(() => {
    const channel = supabase
      .channel("sidebar-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        window.dispatchEvent(new Event("update-badges"))
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        window.dispatchEvent(new Event("update-badges"))
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        window.dispatchEvent(new Event("update-badges"))
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        window.dispatchEvent(new Event("update-badges"))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Gdy wchodzisz w zakładkę, natychmiast oznacza jej WSZYSTKIE rekordy jako odczytane
  async function handleNavClick(path: string) {
    if (user?.id) {
      if (path === "/") {
        setUnreadMatches(false)
        const { data } = await supabase.from("matches").select("id")
        await markKeysRead(user.id, (data || []).map((d) => `match-${d.id}`))
      }
      if (path === "/players") {
        setUnreadPlayers(false)
        const { data } = await supabase.from("players").select("id").or("player_status_id.eq.3,role_id.eq.3")
        await markKeysRead(user.id, (data || []).map((d) => `player-${d.id}`))
      }
      if (path === "/finances") {
        setUnreadFinances(false)
        const { data } = await supabase.from("transactions").select("id")
        await markKeysRead(user.id, (data || []).map((d) => `tx-${d.id}`))
      }
      if (path === "/announcements") {
        setUnreadAnnouncements(false)
        const { data } = await supabase.from("announcements").select("id")
        await markKeysRead(user.id, (data || []).map((d) => `announcement-${d.id}`))
      }
    }

    closeSidebar()
    window.dispatchEvent(new Event("update-badges")) // Odświeża dzwonek
    router.push(path) // Routing po stronie klienta — bez tego każdy klik przeładowywał całą aplikację od zera
  }

  function handleLogoutClick() {
    setConfirmDialog({
      title: "Wylogować się?",
      message: "Żeby wrócić do panelu, będziesz musiał/a zalogować się ponownie.",
      confirmLabel: "Wyloguj",
      danger: true,
      onConfirm: performLogout
    })
  }

  async function performLogout() {
    setConfirmDialog(null)
    localStorage.removeItem("volley_user")
    sessionStorage.clear()
    try { await supabase.auth.signOut() } catch (e) { console.error(e) }
    if (onLogout) onLogout()
    router.push("/login")
  }

  // Każda sekcja ma swój kolor akcentu — ożywia listę i przyspiesza rozpoznawanie zakładek
  const navItems = [
    { href: "/", label: "Mecze", shortLabel: "Mecze", icon: Calendar, hasDot: unreadMatches, color: COBALT },
    { href: "/players", label: "Zawodnicy / Skład", shortLabel: "Skład", icon: Users, hasDot: unreadPlayers, color: "#7A5CFF" },
    { href: "/finances", label: "Finanse", shortLabel: "Finanse", icon: Wallet, hasDot: unreadFinances, color: "#00C48C" },
    { href: "/stats", label: "Statystyki", shortLabel: "Statystyki", icon: BarChart3, hasDot: false, color: YELLOW },
    { href: "/announcements", label: "Ogłoszenia", shortLabel: "Ogłoszenia", icon: Megaphone, hasDot: unreadAnnouncements, color: "#FF5A5F" },
    { href: "/settings", label: "Ustawienia", shortLabel: "Ustawienia", icon: Settings, hasDot: false, color: "#94A3B8" },
    { href: "/profile", label: "Mój profil", shortLabel: "Profil", icon: User, hasDot: false, color: "#94A3B8" },
  ]

  // Te 4 lądują na stałym pasku na dole (mobile) — reszta pod "Więcej", żeby nie stłoczyć
  // 7 ikon w jednym rzędzie. Ten sam navItems zasila oba miejsca, więc kolejność/kolory/
  // odznaki-powiadomień są zawsze spójne między paskiem na dole a szufladą "Więcej".
  const BOTTOM_BAR_HREFS = ["/", "/players", "/finances", "/stats"]
  const bottomBarItems = navItems.filter((item) => BOTTOM_BAR_HREFS.includes(item.href))
  const moreDrawerItems = navItems.filter((item) => !BOTTOM_BAR_HREFS.includes(item.href))
  const isMoreSectionActive = moreDrawerItems.some((item) => item.href === pathname)

  const userName = user?.full_name || user?.name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email?.split("@")[0]) || "Użytkownik"
  const userRoleText = user?.role === "admin" || user?.email === "admin@admin.pl" || user?.name === "Mateusz Podzorski" ? "Administrator" : "Zawodnik"
  const avatarLetter = userName.charAt(0).toUpperCase()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1120]/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col justify-between border-r border-white/10 text-slate-100 transition-transform duration-300 overflow-hidden lg:sticky lg:top-0 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: `linear-gradient(180deg, ${INK} 0%, ${INK_SOFT} 100%)` }}
      >
        {/* Bardzo subtelna faktura siatki — echo hero z dashboardu, ledwo zauważalne */}
        <div className="absolute inset-0 pointer-events-none opacity-60" style={netPattern} />

        <div className="relative flex flex-col min-h-0">
          <div className="flex h-16 items-center justify-between px-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 group min-w-0">
              <img src="/logo.png" alt="ESCO VolleyManager" className="h-9 w-9 shrink-0 rounded-xl shadow-md shadow-[#2C4BFF]/30" />
              <div className="min-w-0">
                <span className={cn(display.className, "font-bold tracking-tight text-white text-[13px] block truncate")}>ESCO VolleyManager</span>
                <span className="block text-[10px] text-slate-400 font-semibold truncate">Menadżer lokalnej siatkówki</span>
              </div>
            </div>
            <button
              onClick={closeSidebar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer active:scale-90 transition-transform shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1.5 p-4 overflow-y-auto">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              // Mecze/Skład/Finanse/Statystyki mają już swój przycisk na stałym pasku na dole
              // (mobile) — pokazywanie ich też w tej szufladzie byłoby czystym duplikatem.
              // Na desktopie (lg:) paska na dole nie ma, więc tam wraca kompletna lista.
              const isBottomBarDuplicate = BOTTOM_BAR_HREFS.includes(item.href)
              return (
                <button
                  key={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleNavClick(item.href)}
                  style={{
                    animationDelay: `${idx * 35}ms`,
                    ...(isActive ? { background: item.color, boxShadow: `0 4px 14px -4px ${item.color}99` } : {})
                  }}
                  className={cn(
                    "w-full relative items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] animate-in fade-in slide-in-from-left-2 fill-mode-both focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD23F]",
                    isBottomBarDuplicate ? "hidden lg:flex" : "flex",
                    isActive
                      ? "text-white font-bold"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {isActive && (
                    <span className="absolute -left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#FFD23F]" />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" style={{ color: isActive ? "#fff" : item.color }} />
                    <span>{item.label}</span>
                  </div>
                  {item.hasDot && <span className="h-2.5 w-2.5 rounded-full bg-[#FF5A5F] ring-2 ring-[#0B1120] animate-pulse shrink-0" />}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="relative p-3 border-t border-white/10 bg-black/10 shrink-0">
          {profileOpen && (
            <div className="mb-2 space-y-1 rounded-2xl border border-white/10 bg-[#121B33] p-2 shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-150">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#FF5A5F] hover:bg-[#FF5A5F]/10 transition-colors cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F]"
              >
                <LogOut className="h-3.5 w-3.5" /> Wyloguj się
              </button>
            </div>
          )}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center justify-between rounded-2xl p-2 hover:bg-white/[0.06] transition-colors cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Litera awatara jako "numer na koszulce" — Oswald, ten sam charakter co liczby w tablicy wyników */}
              <div className={cn(score.className, "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2C4BFF]/15 text-[#8FA1FF] font-semibold text-sm border border-[#2C4BFF]/30")}>
                {avatarLetter}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{userRoleText}</p>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", profileOpen && "rotate-180")} />
          </button>
        </div>
      </aside>

      {/* PASEK NAWIGACJI NA DOLE — mobile only. Zastępuje pływający hamburger + szufladę jako
          główny sposób poruszania się po appce, bo tak wygląda i działa nawigacja w prawdziwych
          appkach (Instagram, bankowe itd.), a nie jak w przeglądanej stronie www. "Więcej" otwiera
          tę samą szufladę co wcześniej — teraz z resztą pozycji (Ogłoszenia/Ustawienia/Profil). */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/10 lg:hidden"
        style={{ background: `linear-gradient(180deg, ${INK_SOFT} 0%, ${INK} 100%)`, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {bottomBarItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <button
              key={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleNavClick(item.href)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 cursor-pointer active:scale-95 transition-transform focus-visible:outline-none"
            >
              {item.hasDot && (
                <span className="absolute top-1.5 right-[calc(50%-16px)] h-2 w-2 rounded-full bg-[#FF5A5F] ring-2 ring-[#0B1120]" />
              )}
              <Icon className="h-5 w-5" style={{ color: isActive ? item.color : "#64748B" }} />
              <span className={cn("text-[9px] font-bold", isActive ? "text-white" : "text-slate-500")}>{item.shortLabel}</span>
            </button>
          )
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 cursor-pointer active:scale-95 transition-transform focus-visible:outline-none"
        >
          <Menu className="h-5 w-5" style={{ color: isMoreSectionActive ? YELLOW : "#64748B" }} />
          <span className={cn("text-[9px] font-bold", isMoreSectionActive ? "text-white" : "text-slate-500")}>Więcej</span>
        </button>
      </nav>

      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </>
  )
}
