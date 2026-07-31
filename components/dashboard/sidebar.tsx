"use client"

import { useState, useRef, useEffect } from "react"
import {
  Calendar,
  Users,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  ChevronUp,
  User,
  CreditCard,
  ShieldAlert,
  Sun,
  Moon
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Mecze", href: "/", icon: Calendar },
  { name: "Zawodnicy / Skład", href: "/players", icon: Users },
  { name: "Finanse", href: "/finances", icon: Wallet, badge: "NOWOŚĆ" },
  { name: "Statystyki", href: "/stats", icon: BarChart3 },
  { name: "Ogłoszenia", href: "/announcements", icon: Megaphone },
  { name: "Ustawienia", href: "/settings", icon: Settings },
]

export function Sidebar({
  open,
  onClose,
  user,
  onLogout
}: {
  open: boolean;
  onClose: () => void;
  user?: any;
  onLogout?: () => void;
}) {
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  // Inicjalizacja i obsługa klasy `dark` na znaczniku <html>
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") !== "light"
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = !isDarkMode
    setIsDarkMode(nextTheme)
    if (nextTheme) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  // Zamykanie menu po kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin"
  const displayName = user?.full_name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email) || "Użytkownik"
  const displayRole = isAdmin ? "Tryb administratora" : "Zawodnika"
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "MP"

  return (
    <>
      {/* Overlay dla mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0d1527] text-white border-r border-border/40 transition-transform duration-300 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo / Header */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
            VM
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight">VolleyManager</h2>
            <p className="text-xs text-slate-400">ESCO Volleyball</p>
          </div>
        </div>

        {/* Nawigacja */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Panel użytkownika na dole */}
        <div className="relative p-4 border-t border-border/40" ref={menuRef}>
          {/* Rozwijane menu z opcjami */}
          {showUserMenu && (
            <div className="absolute bottom-20 left-4 right-4 rounded-2xl bg-[#131d35] border border-border/60 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 space-y-1">

              {/* Nagłówek wewnątrz menu */}
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-xs font-semibold text-slate-300 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  {isAdmin && <ShieldAlert className="h-3 w-3 text-amber-400" />}
                  {displayRole}
                </p>
              </div>

              {/* Opcja 1: Mój Profil */}
              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <User className="h-4 w-4 text-primary" />
                Mój profil i dane
              </Link>

              {/* Opcja 2: Moje Wpłaty */}
              <Link
                href="/finances"
                onClick={() => setShowUserMenu(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Moje finanse i wpłaty
              </Link>

              {/* Opcja 3: Ustawienia */}
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Ustawienia konta
              </Link>

              {/* Opcja 4: Przełącznik Motywu (Jasny / Ciemny) */}
              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isDarkMode ? (
                    <Moon className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-400" />
                  )}
                  Motyw {isDarkMode ? "Ciemny" : "Jasny"}
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isDarkMode ? "Dark" : "Light"}
                </span>
              </button>

              <div className="my-1 border-t border-white/10" />

              {/* Opcja 5: Wylogowanie */}
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  if (onLogout) onLogout()
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj się
              </button>
            </div>
          )}

          {/* Przycisk profilu otwierający menu */}
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 rounded-xl bg-white/5 p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate">{displayRole}</p>
            </div>
            <ChevronUp className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", showUserMenu && "rotate-180")} />
          </div>
        </div>
      </aside>
    </>
  )
}
