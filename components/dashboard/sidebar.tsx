"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Volleyball,
  Calendar,
  Users,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  X,
  ChevronDown,
  User,
  Sun,
  Moon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type SidebarProps = {
  open?: boolean
  onClose?: () => void
  user?: any
  onLogout?: () => void
}

export function Sidebar({ open, onClose, user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)

  // Stany powiadomień (czerwonych kropek) dla poszczególnych zakładek
  const [unreadMatches, setUnreadMatches] = useState(false)
  const [unreadPlayers, setUnreadPlayers] = useState(false)
  const [unreadFinances, setUnreadFinances] = useState(false)

  // Inicjalizacja motywu
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      const dark = savedTheme === "dark"
      setIsDark(dark)
      if (dark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    } else {
      const isSystemDark = document.documentElement.classList.contains("dark")
      setIsDark(isSystemDark)
    }
  }, [])

  // Sprawdzanie zmian w bazie Supabase i aktualizacja kropek
  useEffect(() => {
    checkUnreadBadges()
  }, [pathname])

  async function checkUnreadBadges() {
    const savedRead = JSON.parse(localStorage.getItem("volley_read_sidebar_sections") || "[]")

    // 1. Sprawdzamy czy są mecze w bazie
    const { data: matches } = await supabase.from("matches").select("id").limit(1)
    if (matches && matches.length > 0 && !savedRead.includes("/") && pathname !== "/") {
      setUnreadMatches(true)
    } else {
      setUnreadMatches(false)
    }

    // 2. Sprawdzamy czy są gracze oczekujący na zatwierdzenie ('pending')
    const { data: pendingPlayers } = await supabase.from("players").select("id").eq("role", "pending")
    if (pendingPlayers && pendingPlayers.length > 0 && pathname !== "/players") {
      setUnreadPlayers(true)
    } else {
      setUnreadPlayers(false)
    }

    // 3. Sprawdzamy nieprzeczytane transakcje w Finansach
    const { data: txs } = await supabase.from("transactions").select("id").limit(1)
    if (txs && txs.length > 0 && !savedRead.includes("/finances") && pathname !== "/finances") {
      setUnreadFinances(true)
    } else {
      setUnreadFinances(false)
    }
  }

  // Funkcja czyszcząca kropkę po wejściu w dany dział
  function handleNavClick(path: string) {
    const savedRead = JSON.parse(localStorage.getItem("volley_read_sidebar_sections") || "[]")
    if (!savedRead.includes(path)) {
      const updated = [...savedRead, path]
      localStorage.setItem("volley_read_sidebar_sections", JSON.stringify(updated))
    }

    if (path === "/") setUnreadMatches(false)
    if (path === "/players") setUnreadPlayers(false)
    if (path === "/finances") setUnreadFinances(false)

    if (onClose) onClose()
  }

  function toggleTheme() {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  async function handleLogoutClick() {
    localStorage.removeItem("volley_user")
    localStorage.clear()
    sessionStorage.clear()

    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Błąd wylogowania Supabase:", e)
    }

    if (onLogout) {
      onLogout()
    }

    window.location.href = "/login"
  }

  const navItems = [
    { href: "/", label: "Mecze", icon: Calendar, badge: null, hasDot: unreadMatches },
    { href: "/players", label: "Zawodnicy / Skład", icon: Users, badge: null, hasDot: unreadPlayers },
    { href: "/finances", label: "Finanse", icon: Wallet, badge: "NOWOŚĆ", hasDot: unreadFinances },
    { href: "/stats", label: "Statystyki", icon: BarChart3, badge: null, hasDot: false },
    { href: "/announcements", label: "Ogłoszenia", icon: Megaphone, badge: null, hasDot: false },
    { href: "/settings", label: "Ustawienia", icon: Settings, badge: null, hasDot: false },
  ]

  const userName = user?.full_name || user?.name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email?.split("@")[0]) || "Użytkownik"
  const userRoleText = user?.role === "admin" || user?.email === "admin@admin.pl" || user?.name === "Mateusz Podzorski" ? "Administrator" : "Zawodnik"
  const avatarLetter = userName.charAt(0).toUpperCase()

  return (
    <>
      {/* Tło nakładki dla wersji mobilnej */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Kontener Bocznego Paska Nawigacji */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col justify-between border-r border-border bg-card text-card-foreground transition-transform duration-300 overflow-hidden lg:sticky lg:top-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Górna sekcja: Logo + Nawigacja */}
        <div className="flex flex-col min-h-0">
          {/* Nagłówek Sidebara / Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border/60 shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                <Volleyball className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-foreground text-sm">VolleyManager</span>
                <span className="block text-[10px] text-muted-foreground font-semibold">ESCO Volleyball</span>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Nawigacyjne */}
          <nav className="space-y-1.5 p-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-bold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* PLAKIETKA BADGE */}
                    {item.badge && (
                      <span className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      )}>
                        {item.badge}
                      </span>
                    )}

                    {/* CZERWONA KROPKA POWIADOMIENIA PRZY ZAKŁADCE */}
                    {item.hasDot && (
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sekcja Profilu Użytkownika na dole */}
        <div className="p-3 border-t border-border/60 bg-secondary/30 shrink-0">
          {profileOpen && (
            <div className="mb-2 space-y-1 rounded-2xl border border-border bg-popover p-2 shadow-xl backdrop-blur">
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <User className="h-3.5 w-3.5 text-primary" />
                Mój profil i dane
              </Link>

              <Link
                href="/finances"
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                Moje finanse i wpłaty
              </Link>

              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  {isDark ? <Moon className="h-3.5 w-3.5 text-amber-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
                  Motyw {isDark ? "Ciemny" : "Jasny"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{isDark ? "DARK" : "LIGHT"}</span>
              </button>

              <div className="pt-1 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Wyloguj się
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center justify-between rounded-2xl p-2 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-xs border border-primary/30">
                {avatarLetter}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userRoleText}</p>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", profileOpen && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  )
}
