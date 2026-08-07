"use client"

import { useState, useEffect } from "react"
import { User, Mail, Shield, Calendar, Trophy, Wallet, CheckCircle2 } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUserData() {
      setLoading(true)
      const localUser = localStorage.getItem("volley_user")
      if (localUser) {
        setUser(JSON.parse(localUser))
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
      setLoading(false)
    }

    loadUserData()
  }, [])

  const displayName = user?.full_name || user?.name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email) || "Użytkownik"
  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin" || user?.role_id === 1
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "MP"

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">

          {/* Nagłówek spójny z resztą aplikacji (Usunięto Powrót do pulpitu) */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Profil Użytkownika</h1>
              <p className="text-xs font-medium text-slate-500">Podgląd Twoich danych osobowych oraz statusu w zespole.</p>
            </div>
          </div>

          {/* Karta Profilowa */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl shadow-lg shadow-blue-500/20">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-black tracking-tight text-slate-900">{displayName}</h2>
                    <span className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${isAdmin ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                      {isAdmin ? "Administrator" : "Zawodnik ESCO"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                    {user?.email || "brak-emaila@esco.pl"}
                  </p>
                </div>
              </div>

              <Link href="/settings">
                <Button variant="outline" className="rounded-xl text-xs font-bold border-slate-200">
                  Edytuj konto
                </Button>
              </Link>
            </div>
          </div>

          {/* Kafelki Szybkich Statystyk Gracza */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status w zespole</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">Aktywny Gracz</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Bilans rozliczeń</p>
                <p className="text-sm font-black text-emerald-600 mt-0.5">0.00 PLN (Czysto)</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dołączono</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">Sezon 2026</p>
              </div>
            </div>
          </div>

          {/* Informacje systemowe */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">Informacje systemowe</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-bold block mb-0.5">Identyfikator użytkownika</span>
                <span className="font-mono text-slate-900 font-bold block">{user?.id || "local-user-id"}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-bold block mb-0.5">Rola w systemie VolleyManager</span>
                <span className="font-bold text-slate-900 block">{isAdmin ? "Pełne uprawnienia (Administrator)" : "Standardowe (Zawodnik)"}</span>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
