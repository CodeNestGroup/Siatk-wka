"use client"

import { useState } from "react"
import {
  Calendar,
  Users,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  ChevronUp
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

  const displayName = user?.full_name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email) || "Użytkownik"
  const displayRole = user?.email === "admin@admin.pl" || user?.role === "admin" ? "Tryb administratora" : "Zawodnika"
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
        <div className="relative p-4 border-t border-border/40">
          {/* Menu wylogowania wyskakujące po kliknięciu */}
          {showUserMenu && (
            <div className="absolute bottom-20 left-4 right-4 rounded-xl bg-[#131d35] border border-border/60 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj się
              </button>
            </div>
          )}

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
            <ChevronUp className={cn("h-4 w-4 text-slate-400 transition-transform", showUserMenu && "rotate-180")} />
          </div>
        </div>
      </aside>
    </>
  )
}
