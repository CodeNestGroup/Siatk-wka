"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  User,
  Lock,
  Bell,
  CheckCircle2,
  Save,
  KeyRound,
  Mail,
  CreditCard,
  Download,
  Smartphone,
  AlertCircle
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Stany profilowe (Pkt 7.0: usunięto pozycję i numer na koszulce)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  // Stany bezpieczeństwa (Pkt 7.1)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Stany płatności (dla admina)
  const [blikNumber, setBlikNumber] = useState("+48 600 000 000")
  const [bankAccount, setBankAccount] = useState("12 3456 7890 0000 1111 2222 3333")

  // Powiadomienia (Pkt 7.2: usunięto SMS, zostawiono Email i Push)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyPush, setNotifyPush] = useState(true)

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*]).{6,}$/

  useEffect(() => {
    async function loadUserData() {
      const localUser = localStorage.getItem("volley_user")
      let activeUser = null

      if (localUser) {
        activeUser = JSON.parse(localUser)
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          activeUser = session.user
        }
      }

      if (activeUser) {
        setUser(activeUser)
        setFullName(activeUser.full_name || activeUser.name || (activeUser.email === "admin@admin.pl" ? "Mateusz Podzorski" : ""))
        setEmail(activeUser.email || "")
      }
    }

    loadUserData()
  }, [])

  function showNotify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (user) {
      const updatedUser = { ...user, full_name: fullName, name: fullName, email }
      localStorage.setItem("volley_user", JSON.stringify(updatedUser))
      setUser(updatedUser)

      // Aktualizacja w bazie Supabase
      await supabase.from("players").update({ full_name: fullName, email }).eq("id", user.id)

      showNotify("Zapisano dane zawodnika!")
    }
  }

  // Pkt 7.1: Bezpieczna zmiana hasła z pełną walidacją
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError("Nowe hasła nie są identyczne.")
      return
    }
    if (!passwordRegex.test(newPassword)) {
      setPasswordError("Hasło musi mieć min. 6 znaków, jedną wielką literę i znak specjalny (!@#$&*).")
      return
    }

    const { error } = await supabase.from("players").update({ password: newPassword }).eq("id", user.id)

    if (error) {
      setPasswordError("Błąd zmiany hasła w bazie danych.")
    } else {
      setNewPassword("")
      setConfirmPassword("")
      showNotify("Hasło zostało pomyślnie zmienione!")
    }
  }

  async function handleSaveFinanceSettings(e: React.FormEvent) {
    e.preventDefault()
    showNotify("Zapisano parametry rozliczeń i konto BLIK!")
  }

  // Pkt 7.4: Dedykowany eksport wyłącznie własnych danych użytkownika
  async function exportMyData() {
    const { data: matches } = await supabase.from("matches").select("*")
    let myMatchesCount = 0
    let totalSpent = 0

    matches?.forEach(m => {
      if (Array.isArray(m.players)) {
        const p = m.players.find((pl: any) => pl.name === fullName || pl.full_name === fullName)
        if (p) {
          myMatchesCount++
          if (p.paid) totalSpent += Number(m.price_per_player || 25)
        }
      }
    })

    let csv = "Moje Imię,Rozegrane Mecze,Suma Wydanych Środków (PLN)\n"
    csv += `"${fullName}",${myMatchesCount},${totalSpent}\n`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `moje_dane_${fullName.replace(/\s+/g, "_")}.csv`
    link.click()
    showNotify("Pobrano plik z Twoimi statystykami!")
  }

  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin" || user?.is_admin || user?.role_id === 1

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">

          {/* Nagłówek spójny z resztą aplikacji */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Ustawienia i Preferencje</h1>
              <p className="text-xs font-medium text-slate-500">Zarządzaj swoimi danymi zawodnika, powiadomieniami oraz kontem.</p>
            </div>
          </div>

          {/* Sekcja 1: Dane Profilowe & Karta Zawodnika */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Profil Zawodnika</h2>
                <p className="text-xs text-slate-400 font-medium">Twoje dane osobowe w systemie</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Imię i nazwisko</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="np. Mateusz Podzorski"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adres e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="gap-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-4 w-4" />
                  Zapisz profil zawodnika
                </Button>
              </div>
            </form>
          </div>

          {/* Sekcja 2: Dane do Szybkich Wpłat (dla Admina) */}
          {isAdmin && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Dane do Rozliczeń i Wpisowego</h2>
                  <p className="text-xs text-slate-400 font-medium">Numer BLIK i konto bankowe wyświetlane graczom przy wpłatach</p>
                </div>
              </div>

              <form onSubmit={handleSaveFinanceSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Telefon do przelewu BLIK</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={blikNumber}
                        onChange={(e) => setBlikNumber(e.target.value)}
                        placeholder="+48 600 000 000"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Numer konta bankowego (IBAN)</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="00 0000 0000 0000 0000 0000 0000"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="outline" className="gap-2 rounded-xl text-xs font-bold border-slate-200">
                    <Save className="h-4 w-4 text-emerald-600" />
                    Zapisz dane do wpłat
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Sekcja 3: Bezpieczeństwo i Hasło */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Bezpieczeństwo i Hasło</h2>
                <p className="text-xs text-slate-400 font-medium">Zmień swoje hasło dostępowe do aplikacji</p>
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nowe hasło</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Min. 6 znaków, jedna wielka litera, znak specjalny (!@#$&*).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Powtórz nowe hasło</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="outline" className="gap-2 rounded-xl text-xs font-bold border-slate-200">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Zmień hasło
                </Button>
              </div>
            </form>
          </div>

          {/* Sekcja 4: Powiadomienia */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Kanały Powiadomień</h2>
                <p className="text-xs text-slate-400 font-medium">Wybierz, w jaki sposób chcesz otrzymywać powiadomienia meczowe</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Powiadomienia e-mail o meczach</p>
                  <p className="text-[11px] text-slate-400">Otrzymuj zaproszenie natychmiast po utworzeniu nowego meczu</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="font-bold text-slate-900">Powiadomienia Push w przeglądarce</p>
                  <p className="text-[11px] text-slate-400">Szybki alert w aplikacji w przypadku odwołania spotkania</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyPush}
                  onChange={(e) => setNotifyPush(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Sekcja 5: Eksport Własnych Danych */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-600" />
                Eksport Twoich danych zawodnika
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Pobierz zestawienie swoich rozegranych meczów i poniesionych opłat w formacie CSV.</p>
            </div>
            <Button onClick={exportMyData} variant="outline" className="rounded-xl gap-2 text-xs font-bold border-slate-200">
              <Download className="h-4 w-4 text-blue-600" />
              Pobierz Moje Statystyki (.CSV)
            </Button>
          </div>

        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
