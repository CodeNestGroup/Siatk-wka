"use client"

import { Award } from "lucide-react"

type Sponsor = {
  name: string
  logoText: string
  tagline: string
  color: string
}

const sponsors: Sponsor[] = [
  { name: "ESCO Jaworze", logoText: "ESCO", tagline: "Sponsor Tytularny", color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30" },
  { name: "Beskid Sport Center", logoText: "BSC", tagline: "Partner Sprzętowy", color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30" },
  { name: "Skoczów Park", logoText: "SKO", tagline: "Oficjalny Partner", color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30" },
  { name: "VolleyStore", logoText: "VOLLEY", tagline: "Sklep Siatkarski", color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30" },
  { name: "AZ-Cloud Solutions", logoText: "AZ", tagline: "Infrastruktura IT", color: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30" },
]

export function SponsorsMarquee() {
  // Duplikujemy listę, aby stworzyć idealną, płynną pętlę bez przerw
  const duplicatedSponsors = [...sponsors, ...sponsors, ...sponsors]

  return (
    <div className="relative rounded-2xl border border-border/80 bg-card/40 p-4 backdrop-blur-md overflow-hidden shadow-sm">
      {/* Nagłówek sekcji */}
      <div className="flex items-center gap-2 mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Award className="h-4 w-4 text-amber-400" />
        <span>Sponsorzy i Partnerzy Zespołu</span>
      </div>

      {/* Maski wygaszające krawędzie (Gradient Fade) */}
      <div className="pointer-events-none absolute left-0 top-10 bottom-0 z-10 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute right-0 top-10 bottom-0 z-10 w-16 bg-gradient-to-l from-card to-transparent" />

      {/* Kontener taśmociągu */}
      <div className="overflow-hidden w-full">
        <div className="animate-marquee gap-4 py-1">
          {duplicatedSponsors.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-2.5 transition-all hover:scale-105 hover:bg-secondary/70 shrink-0 shadow-sm"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br border font-black text-xs tracking-wider shadow-inner ${s.color}`}>
                {s.logoText}
              </div>
              <div className="pr-2">
                <p className="text-xs font-bold text-foreground leading-snug">{s.name}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.tagline}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
