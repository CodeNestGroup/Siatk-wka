import { Calendar, Clock, Wallet, Users, ArrowRightLeft, TrendingUp } from "lucide-react"

type StatCardsProps = {
  mode: "match" | "season"
  onToggleMode: () => void
  matchData: {
    date: string
    location: string
    rosterCount: number
    capacity: number
    waitlistCount: number
    collected: number
    fee: number
  } | null
  seasonData: {
    totalPlayed: number
    upcoming: number
    collected: number
    overpaid: string
  }
}

export function StatCards({ mode, onToggleMode, matchData, seasonData }: StatCardsProps) {
  const stats = mode === "match" ? [
    {
      title: "Najbliższy mecz",
      value: matchData ? matchData.date : "Brak",
      subtitle: matchData ? matchData.location : "Brak zaplanowanych spotkań",
      icon: Calendar,
      gradient: "from-blue-600/20 via-indigo-500/10 to-transparent",
      border: "border-blue-500/30 hover:border-blue-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
      iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    {
      title: "Skład główny",
      value: matchData ? `${matchData.rosterCount} / ${matchData.capacity}` : "0 / 0",
      subtitle: matchData && matchData.rosterCount >= matchData.capacity ? "Skład pełny!" : "Wolne miejsca",
      icon: Users,
      gradient: "from-purple-600/20 via-fuchsia-500/10 to-transparent",
      border: "border-purple-500/30 hover:border-purple-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]",
      iconBg: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    },
    {
      title: "Lista rezerwowa",
      value: matchData ? `+${matchData.waitlistCount}` : "0",
      subtitle: "Graczy na rezerwie",
      icon: Clock,
      gradient: "from-amber-600/20 via-orange-500/10 to-transparent",
      border: "border-amber-500/30 hover:border-amber-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Budżet meczu",
      value: matchData ? `${matchData.collected} PLN` : "0 PLN",
      subtitle: matchData ? `Koszt: ${matchData.fee} PLN / os.` : "Brak danych",
      icon: Wallet,
      gradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
      border: "border-emerald-500/30 hover:border-emerald-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
  ] : [
    {
      title: "Rozegrane mecze",
      value: seasonData.totalPlayed,
      subtitle: "Ten sezon",
      icon: Calendar,
      gradient: "from-blue-600/20 via-indigo-500/10 to-transparent",
      border: "border-blue-500/30 hover:border-blue-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
      iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    {
      title: "Nadchodzące",
      value: seasonData.upcoming,
      subtitle: "Następne 14 dni",
      icon: Clock,
      gradient: "from-amber-600/20 via-orange-500/10 to-transparent",
      border: "border-amber-500/30 hover:border-amber-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Zebrane opłaty",
      value: `${seasonData.collected} PLN`,
      subtitle: "Ten miesiąc",
      icon: Wallet,
      gradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
      border: "border-emerald-500/30 hover:border-emerald-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Nadpłaty / Bilans",
      value: seasonData.overpaid,
      subtitle: "Środki dodatkowe",
      icon: TrendingUp,
      gradient: "from-emerald-600/20 via-green-500/10 to-transparent",
      border: "border-emerald-500/30 hover:border-emerald-500/60",
      glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {mode === "match" ? "Podgląd: Najbliższy mecz" : "Podgląd: Cały sezon / Miesiąc"}
        </span>
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary hover:border-primary/40 shadow-sm backdrop-blur"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
          Przełącz na {mode === "match" ? "Cały sezon" : "Najbliższy mecz"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`group relative overflow-hidden rounded-2xl border bg-card/80 p-5 backdrop-blur-md transition-all duration-300 ${stat.border} ${stat.glow}`}
          >
            {/* Wyraźniejszy gradient tła */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-80 transition-opacity group-hover:opacity-100 pointer-events-none`} />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">{stat.title}</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground truncate max-w-[180px]">{stat.value}</h3>
                <p className="mt-1 text-xs text-muted-foreground font-medium">{stat.subtitle}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.iconBg} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
