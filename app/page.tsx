"use client"

import { useMemo, useState } from "react"
import { Menu, Plus, Search, Bell, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/dashboard/sidebar"
import { StatCards } from "@/components/dashboard/stat-cards"
import { MatchList } from "@/components/dashboard/match-list"
import { MatchDetail } from "@/components/dashboard/match-detail"
import { CreateMatch } from "@/components/dashboard/create-match"
import {
  matches as seedMatches,
  type Match,
  collected as matchCollected,
  mainRoster,
} from "@/lib/data"
import { cn } from "@/lib/utils"

type Filter = "all" | "upcoming" | "past"

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>(seedMatches)
  const [filter, setFilter] = useState<Filter>("all")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const selected = matches.find((m) => m.id === selectedId) ?? null

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = useMemo(
    () => matches.filter((m) => (filter === "all" ? true : m.status === filter)),
    [matches, filter],
  )

  const stats = useMemo(() => {
    const played = matches.filter((m) => m.status === "past")
    const upcoming = matches.filter((m) => m.status === "upcoming")
    const monthCollected = matches.reduce((sum, m) => sum + matchCollected(m), 0)
    const conversions = matches.reduce(
      (sum, m) => sum + Math.max(0, mainRoster(m).length - m.capacity + 3),
      0,
    )
    return {
      played: played.length,
      upcoming: upcoming.length,
      collected: monthCollected,
      conversions: Math.min(conversions, 9),
    }
  }, [matches])

  function updateMatch(updated: Match) {
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  function deleteMatch(match: Match) {
    setMatches((prev) => prev.filter((m) => m.id !== match.id))
    notify("Match deleted")
  }

  function createMatch(match: Match) {
    setMatches((prev) => [match, ...prev])
    setCreating(false)
    notify("Match created")
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-sm md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search matches, players…"
              className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              AK
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8">
          {/* Page heading */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Match Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track rosters, waitlists, and fees across every session.
              </p>
            </div>
            <Button size="lg" className="gap-2" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Create New Match
            </Button>
          </div>

          <StatCards
            totalPlayed={stats.played}
            upcoming={stats.upcoming}
            collected={stats.collected}
            conversions={stats.conversions}
          />

          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No matches in this view yet.
              </p>
            </div>
          ) : (
            <MatchList
              matches={filtered}
              onSelect={(m) => setSelectedId(m.id)}
              onNotify={(m) =>
                notify(`Push sent to ${mainRoster(m).length} enrolled players`)
              }
              onDelete={deleteMatch}
            />
          )}
        </main>
      </div>

      {selected && (
        <MatchDetail
          match={selected}
          onChange={updateMatch}
          onClose={() => setSelectedId(null)}
        />
      )}

      {creating && (
        <CreateMatch onCreate={createMatch} onClose={() => setCreating(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </div>
  )
}
