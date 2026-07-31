import { Calendar, MapPin, Users, ChevronRight } from "lucide-react"
import { type Match, mainRoster, waitlist, collected } from "@/lib/data"

type MatchListProps = {
  matches: Match[]
  onSelect: (match: Match) => void
  onNotify: (match: Match) => void
  onDelete?: (match: Match) => void
}

export function MatchList({ matches, onSelect }: MatchListProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {matches.map((match) => {
        const rosterCount = mainRoster(match).length
        const waitlistCount = waitlist(match).length
        const totalCollected = collected(match)
        const isUpcoming = match.status === "upcoming"

        return (
          <div
            key={match.id}
            onClick={() => onSelect(match)}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md cursor-pointer"
          >
            {/* Subtelny gradient w tle po najechaniu */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-transform group-hover:scale-105 ${
                  isUpcoming ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                }`}>
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                      {match.date}
                    </h3>

                    {/* Zaktualizowany Badge statusu dopasowany do ikonki obok */}
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold border transition-colors ${
                      isUpcoming
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-secondary text-muted-foreground border-border/40"
                    }`}>
                      {isUpcoming ? "Nadchodzący" : "Zakończony"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {match.location} • <span className="font-medium text-foreground">{match.price_per_player} PLN</span> / os.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-border/60">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Skład: <strong className="text-foreground">{rosterCount}/{match.capacity}</strong></span>
                  </div>
                  {waitlistCount > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <span>Rezerwa: <strong>+{waitlistCount}</strong></span>
                    </div>
                  )}
                  <div className="hidden lg:block">
                    <span>Wpłaty: <strong className="text-emerald-500">{totalCollected} PLN</strong></span>
                  </div>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
