import { CalendarCheck, CalendarClock, Wallet, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: string
  hint: string
  icon: typeof Wallet
  tone: string
}

export function StatCards({
  totalPlayed,
  upcoming,
  collected,
  conversions,
}: {
  totalPlayed: number
  upcoming: number
  collected: number
  conversions: number
}) {
  const stats: Stat[] = [
    {
      label: "Matches Played",
      value: String(totalPlayed),
      hint: "This season",
      icon: CalendarCheck,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Upcoming Matches",
      value: String(upcoming),
      hint: "Next 14 days",
      icon: CalendarClock,
      tone: "bg-warning/20 text-warning-foreground",
    },
    {
      label: "Fees Collected",
      value: `${collected.toLocaleString()} PLN`,
      hint: "This month",
      icon: Wallet,
      tone: "bg-success/12 text-success",
    },
    {
      label: "Waitlist Conversions",
      value: String(conversions),
      hint: "Promoted to main",
      icon: TrendingUp,
      tone: "bg-accent text-accent-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  stat.tone,
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
