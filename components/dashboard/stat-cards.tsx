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
      gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      borderHover: "hover:border-blue-500/40",
    },
    {
      title: "Skład główny",
      value: matchData ? `${matchData.rosterCount} / ${matchData.capacity}` : "0 / 0",
      subtitle: matchData && matchData.rosterCount >= matchData.capacity ? "Skład pełny!" : "Wolne miejsca",
      icon: Users,
      gradient: "from-purple-500/10 via-fuchsia-500/5 to-transparent", // Fioletowy
      iconBg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      borderHover: "hover:border-purple-500/40",
    },
    {
      title: "Lista rezerwowa",
      value: matchData ? `+${matchData.waitlistCount}` : "0",
      subtitle: "Graczy na rezerwie",
      icon: Clock,
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      borderHover: "hover:border-amber-500/40",
    },
    {
      title: "Budżet meczu",
      value: matchData ? `${matchData.collected} PLN` : "0 PLN",
      subtitle: matchData ? `Koszt: ${matchData.fee} PLN / os.` : "Brak danych",
      icon: Wallet,
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent", // Zielony
      iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      borderHover: "hover:border-emerald-500/40",
    },
  ] : [
    {
      title: "Rozegrane mecze",
      value: seasonData.totalPlayed,
      subtitle: "Ten sezon",
      icon: Calendar,
      gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      borderHover: "hover:border-blue-500/40",
    },
    {
      title: "Nadchodzące",
      value: seasonData.upcoming,
      subtitle: "Następne 14 dni",
      icon: Clock,
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      borderHover: "hover:border-amber-500/40",
    },
    {
      title: "Zebrane opłaty",
      value: `${seasonData.collected} PLN`,
      subtitle: "Ten miesiąc",
      icon: Wallet,
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      borderHover: "hover:border-emerald-500/40",
    },
    {
      title: "Nadpłaty / Bilans",
      value: seasonData.overpaid,
      subtitle: "Środki dodatkowe",
      icon: TrendingUp,
      gradient: "from-emerald-500/10 via-green-500/5 to-transparent", // Zielony
      iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      borderHover: "hover:border-emerald-500/40",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {mode === "match" ? "⚡ Podgląd: Najbliższy mecz" : "📊 Podgląd: Cały sezon / Miesiąc"}
        </span>
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary shadow-sm"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
          Przełącz na {mode === "match" ? "Cały sezon" : "Najbliższy mecz"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ${stat.borderHover} hover:shadow-md group`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60 pointer-events-none transition-opacity group-hover:opacity-100`} />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground truncate max-w-[180px]">{stat.value}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.iconBg} shadow-inner transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
