"use client"

import { useState, useEffect } from "react"
import { Trophy, UserCheck, ArrowRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadPlayers() {
      setIsLoading(true)

      // Pobieranie zawodników z Supabase
      const { data, error } = await supabase.from("players").select("*")

      let rawPlayers: any[] = []

      if (!error && data && data.length > 0) {
        rawPlayers = data
      }

      // Bezwarunkowa filtracja "Głównego Admina"
      const cleanPlayers = rawPlayers.filter((p) => {
        const name = (p.full_name || p.name || "").toLowerCase()
        return !name.includes("główny admin") && !name.includes("glowny admin")
      })

      // Nadajemy uprawnienia Admina dla konta Mateusz Podzorski
      const formattedPlayers = cleanPlayers.map((p) => {
        const name = p.full_name || p.name || ""
        let role = p.role || "player"
        let isAdmin = p.is_admin || false

        if (name === "Mateusz Podzorski") {
          role = "admin"
          isAdmin = true
        }

        return {
          id: p.id,
          name: name,
          full_name: name,
          email: p.email,
          role: role,
          is_admin: isAdmin
        }
      })

      setPlayers(formattedPlayers)

      if (formattedPlayers.length > 0) {
        setSelectedPlayer(formattedPlayers[0])
      }

      setIsLoading(false)
    }

    loadPlayers()
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlayer) return

    localStorage.setItem("volley_user", JSON.stringify(selectedPlayer))
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 text-slate-900">
      <div className="w-full max-w-md space-y-6">

        {/* Logo i Nagłówek */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            VolleyManager
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            Wybierz swój profil, aby przejść do panelu zespołu
          </p>
        </div>

        {/* Karta Logowania */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 space-y-5">
          {isLoading ? (
            <div className="py-8 text-center text-xs font-bold text-blue-600 animate-pulse">
              Ładowanie listy zawodników z bazy Supabase...
            </div>
          ) : players.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              Brak graczy w bazie. Zaloguj się domyślnie lub dodaj ich w zakładce Zawodnicy.
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Wybierz zawodnika z bazy
                </label>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {players.map((player) => {
                    const isSelected = selectedPlayer?.id === player.id
                    const name = player.name || player.full_name

                    return (
                      <div
                        key={player.id}
                        onClick={() => setSelectedPlayer(player)}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-900 shadow-sm"
                            : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-xl font-black ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {name ? name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span>{name}</span>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-extrabold uppercase text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-md">
                            Wybrany
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!selectedPlayer}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 py-3 font-extrabold text-xs text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                Zaloguj się do panelu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>

        {/* Stopka */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <Shield className="h-3.5 w-3.5 text-slate-400" />
          ESCO Volleyball System
        </div>

      </div>
    </div>
  )
}
