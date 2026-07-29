"use client"

import {
  CalendarDays,
  Users,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  Volleyball,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Matches", icon: CalendarDays, active: true },
  { label: "Players / Squad", icon: Users, active: false },
  { label: "Financials", icon: Wallet, active: false, badge: "New" },
  { label: "Statistics", icon: BarChart3, active: false },
  { label: "Announcements", icon: Megaphone, active: false },
  { label: "Settings", icon: Settings, active: false },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Volleyball className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-sidebar-primary-foreground">
                VolleyManager
              </p>
              <p className="text-xs text-sidebar-foreground/70">ESCO Volleyball</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.label}
                href="#"
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success-foreground">
                    {item.badge}
                  </span>
                )}
              </a>
            )
          })}
        </nav>

        <div className="m-4 flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            AK
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              Adam Kowalski
            </p>
            <p className="text-xs text-sidebar-foreground/70">Admin mode</p>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
        </div>
      </aside>
    </>
  )
}
