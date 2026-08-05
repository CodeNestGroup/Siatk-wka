"use client"

import { useState } from "react"
import { Shuffle, X, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TeamBalancerModal({ match, onClose }: { match: any; onClose: () => void }) {
  const [teamA, setTeamA] = useState<any[]>([])
  const [teamB, setTeamB] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  function shuffleTeams() {
    const players = Array.isArray(match?.players) ? [...match.players] : []

    // Algorytm Fisher-Yates do losowego mieszania
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]]
    }

    const half = Math.ceil(players.length / 2)
    setTeamA(players.slice(0, half))
    setTeamB(players.slice(half))
  }

  function copyTeamsToClipboard() {
    const dateStr = match?.date || "Trening"
    const text = `🏐 *PODZIAŁ NA DRUŻYNY (${dateStr})*\n\n⚪ *DRUŻYNA BIAŁA (${teamA.length}):*\n${teamA.map((p, i) => `${i + 1}. ${p.name || p.full_name}`).join("\n")}\n\n🔵 *DRUŻYNA NIEBIESKA (${teamB.length}):*\n${teamB.map((p, i) => `${i + 1}. ${p.name || p.full_name}`).join("\n")}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-blue-600" />
            Generator Składów A vs B
          </h2>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {teamA.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-xs font-semibold text-slate-500">
              Kliknij przycisk poniżej, aby rozlosować obecnych graczy na dwa wyrównane zespoły.
            </p>
            <Button onClick={shuffleTeams} className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white gap-2 shadow-lg shadow-blue-500/25">
              <Shuffle className="h-4 w-4" />
              Losuj Składy A vs B
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Team A */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="font-black text-slate-700 uppercase text-[10px]">⚪ Drużyna Biała ({teamA.length})</p>
                <ul className="space-y-1 font-bold text-slate-700">
                  {teamA.map((p, i) => (
                    <li key={i} className="bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm text-[11px]">
                      {p.name || p.full_name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Team B */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                <p className="font-black text-blue-600 uppercase text-[10px]">🔵 Drużyna Niebieska ({teamB.length})</p>
                <ul className="space-y-1 font-bold text-slate-700">
                  {teamB.map((p, i) => (
                    <li key={i} className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm text-[11px]">
                      {p.name || p.full_name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={shuffleTeams} className="rounded-xl text-xs font-bold gap-1.5">
                <Shuffle className="h-3.5 w-3.5" /> Ponowne losowanie
              </Button>
              <Button size="sm" onClick={copyTeamsToClipboard} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Skopiowano!" : "Kopiuj podział"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
