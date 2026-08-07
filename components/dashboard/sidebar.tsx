"use client"

import { useState, useEffect, useCallback } from "react"
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
  const [isDark, setIsDark] = useState(false)

  const [unreadMatches, setUnreadMatches] = useState(false)
  const [unreadPlayers, setUnreadPlayers] = useState(false)
  const [unreadFinances, setUnreadFinances] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const dark = savedTheme === "dark"
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const checkUnreadBadges = useCallback(async () => {
    const readMatches = JSON.parse(localStorage.getItem("volley_read_matches") || "[]")
    const readPlayers = JSON.parse(localStorage.getItem("volley_read_players") || "[]")
    const readTxs = JSON.parse(localStorage.getItem("volley_read_txs") || "[]")

    // 1. MECZE
    if (pathname === "/") {
      setUnreadMatches(false)
    } else {
      const { data: matches } = await supabase.from("matches").select("id").limit(50).order("created_at", { ascending: false })
      setUnreadMatches(!!matches?.some(m => !readMatches.includes(String(m.id))))
    }

    // 2. ZAWODNICY
    if (pathname === "/players") {
      setUnreadPlayers(false)
    } else {
      const { data: pending } = await supabase.from("players").select("id").or("player_status_id.eq.3,role_id.eq.3")
      setUnreadPlayers(!!pending?.some(p => !readPlayers.includes(String(p.id))))
    }

    // 3. FINANSE
    if (pathname === "/finances") {
      setUnreadFinances(false)
    } else {
      const { data: txs } = await supabase.from("transactions").select("id").limit(50).order("created_at", { ascending: false })
      setUnreadFinances(!!txs?.some(t => !readTxs.includes(String(t.id))))
    }
  }, [pathname])

  useEffect(() => {
    checkUnreadBadges()
    window.addEventListener("update-badges", checkUnreadBadges)
    return () => {
      window.removeEventListener("update-badges", checkUnreadBadges)
    }
  }, [checkUnreadBadges])

  // Gdy wchodzisz w zakładkę, natychmiast oznacza jej WSZYSTKIE rekordy jako odczytane
  async function handleNavClick(path: string) {
    if (path === "/") {
      setUnreadMatches(false)
      const { data } = await supabase.from("matches").select("id")
      localStorage.setItem("volley_read_matches", JSON.stringify(data?.map(d => String(d.id)) || []))
    }
    if (path === "/players") {
      setUnreadPlayers(false)
      const { data } = await supabase.from("players").select("id").or("player_status_id.eq.3,role_id.eq.3")
      localStorage.setItem("volley_read_players", JSON.stringify(data?.map(d => String(d.id)) || []))
    }
    if (path === "/finances") {
      setUnreadFinances(false)
      const { data } = await supabase.from("transactions").select("id")
      localStorage.setItem("volley_read_txs", JSON.stringify(data?.map(d => String(d.id)) || []))
    }

    if (onClose) onClose()
    window.dispatchEvent(new Event("update-badges")) // Odświeża dzwonek
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
    sessionStorage.clear()
    try { await supabase.auth.signOut() } catch (e) { console.error(e) }
    if (onLogout) onLogout()
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
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside className={cn("fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col justify-between border-r border-slate-800 bg-[#0F172A] text-slate-100 transition-transform duration-300 overflow-hidden lg:sticky lg:top-0 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex flex-col min-h-0">
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
                <Volleyball className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-white text-sm">VolleyManager</span>
                <span className="block text-[10px] text-slate-400 font-semibold">ESCO Volleyball</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1.5 p-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    handleNavClick(item.href)
                    window.location.href = item.href // Bezpośrednie przejście linkiem zastąpione buttonem dla asynchronicznej akcji
                  }}
                  className={cn("w-full relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200", isActive ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold" : "text-slate-400 hover:bg-slate-800/60 hover:text-white cursor-pointer")}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", isActive ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20")}>{item.badge}</span>}
                    {item.hasDot && <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#0F172A] animate-pulse" />}
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 shrink-0">
          {profileOpen && (
            <div className="mb-2 space-y-1 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-xl">
              <button onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <span className="flex items-center gap-2">{isDark ? <Moon className="h-3.5 w-3.5 text-amber-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />} Motyw {isDark ? "Ciemny" : "Jasny"}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isDark ? "DARK" : "LIGHT"}</span>
              </button>
              <div className="pt-1 border-t border-slate-800">
                <button type="button" onClick={handleLogoutClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                  <LogOut className="h-3.5 w-3.5" /> Wyloguj się
                </button>
              </div>
            </div>
          )}
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex w-full items-center justify-between rounded-2xl p-2 hover:bg-slate-800/60 transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 font-bold text-xs border border-blue-500/30">{avatarLetter}</div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{userRoleText}</p>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", profileOpen && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  )
}
