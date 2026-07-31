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


type SidebarProps = {
  open?: boolean
  onClose?: () => void
  user?: any
  onLogout?: () => void
}

const navItems = [
  { href: "/", label: "Mecze", icon: Calendar },
  { href: "/players", label: "Zawodnicy / Skład", icon: Users },
  { href: "/finances", label: "Finanse", icon: Wallet, badge: "NOWOŚĆ" },
  { href: "/stats", label: "Statystyki", icon: BarChart3 },
  { href: "/announcements", label: "Ogłoszenia", icon: Megaphone },
  { href: "/settings", label: "Ustawienia", icon: Settings },
]

export function Sidebar({ open, onClose, user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)

  // Inicjalizacja motywu na podstawie ustawień przeglądarki / localStorage
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

  // Funkcja przełączająca motyw w całej aplikacji
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

  const userName = user?.full_name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email?.split("@")[0]) || "brudas"
  const userRoleText = user?.role === "admin" || user?.email === "admin@admin.pl" ? "Administrator" : "Zawodnik"
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card text-card-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Nagłówek Sidebara / Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Volleyball className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-foreground text-sm">VolleyManager</span>
              <span className="block text-[10px] text-muted-foreground font-semibold">ESCO Volleyball</span>
            </div>
          </Link>

          {/* Przycisk zamknięcia na telefonach */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Nawigacyjne */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-bold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </div>
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
              </Link>
            )
          })}
        </nav>


        {/* Sekcja Profilu Użytkownika na dole */}
        <div className="p-3 border-t border-border/60 bg-secondary/30">
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

              {/* Działający Przełącznik Motywu */}
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
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Wyloguj się
                </button>
              </div>
            </div>
          )}

          {/* Przycisk otwierający menu profilu */}
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
