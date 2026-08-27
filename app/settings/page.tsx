"use client"

import { useState, useEffect } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
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
  AlertCircle,
  Coffee
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })

const COBALT = "#2C4BFF"

// Prosty, samodzielny przełącznik — zastępuje gołe checkboxy przeglądarki
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer active:scale-95",
        checked ? "bg-[#2C4BFF]" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Stany profilowe
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  // Stany bezpieczeństwa
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Stany płatności (dla admina)
  const [blikNumber, setBlikNumber] = useState("+48 600 000 000")
  const [bankAccount, setBankAccount] = useState("12 3456 7890 0000 1111 2222 3333")

  // Powiadomienia
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

        if (activeUser.id) {
          const { data: playerRow } = await supabase
            .from("players")
            .select("notif_announcements, notif_match_reminders")
            .eq("id", activeUser.id)
            .maybeSingle()

          if (playerRow) {
            setNotifyEmail(playerRow.notif_announcements ?? true)
            setNotifyPush(playerRow.notif_match_reminders ?? true)
          }
        }
      }
    }

    loadUserData()

    // Dane do wpłat wcześniej nigdzie się nie zapisywały (ani do bazy, ani nawet między
    // odświeżeniami strony) i modal "Postaw kawę" ich w ogóle nie czytał — dwie rozłączone
    // funkcje udające jedną. To najlepsze bezpieczne rozwiązanie bez dostępu do nowej tabeli
    // w bazie: trzyma dane lokalnie w przeglądarce i faktycznie zasila modal wsparcia.
    const savedBlik = localStorage.getItem("volley_blik_display")
    const savedBank = localStorage.getItem("volley_bank_account")
    if (savedBlik) setBlikNumber(savedBlik)
    if (savedBank) setBankAccount(savedBank)
  }, [])

  async function handleToggleNotifyEmail(next: boolean) {
    setNotifyEmail(next)
    if (!user) return
    await supabase.from("players").update({ notif_announcements: next }).eq("id", user.id)
  }

  async function handleToggleNotifyPush(next: boolean) {
    setNotifyPush(next)
    if (!user) return
    await supabase.from("players").update({ notif_match_reminders: next }).eq("id", user.id)
  }

  function showNotify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleLogout() {
    localStorage.removeItem("volley_user")
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const { error } = await supabase.from("players").update({ full_name: fullName, email }).eq("id", user.id)

    if (error) {
      const isDuplicate = error.code === "23505"
      showNotify(isDuplicate ? "Ta nazwa lub e-mail są już zajęte przez innego zawodnika." : `Błąd zapisu: ${error.message}`)
      return
    }

    const updatedUser = { ...user, full_name: fullName, name: fullName, email }
    localStorage.setItem("volley_user", JSON.stringify(updatedUser))
    setUser(updatedUser)
    showNotify("Zapisano dane zawodnika!")
  }

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

    // Hasło jest hashowane automatycznie po stronie bazy (trigger w
    // supabase/password-hashing-migration.sql) — ta funkcja tylko zleca zapis.
    const { error } = await supabase.rpc("set_player_password", {
      p_player_id: user.id,
      p_new_password: newPassword
    })

    if (error) {
      setPasswordError("Błąd zmiany hasła w bazie danych.")
    } else {
      setNewPassword("")
      setConfirmPassword("")
      showNotify("Hasło zostało pomyślnie zmienione!")
    }
  }

  function handleSaveFinanceSettings(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem("volley_blik_display", blikNumber)
    localStorage.setItem("volley_blik_digits", blikNumber.replace(/\D/g, "").replace(/^48/, ""))
    localStorage.setItem("volley_bank_account", bankAccount)
    window.dispatchEvent(new Event("volley-blik-updated"))
    showNotify("Zapisano — nowy numer BLIK pojawi się w oknie „Postaw kawę” na tym urządzeniu.")
  }

  async function exportMyData() {
    if (!user) return

    // Skład meczowy żyje w `match_registrations`, nie w polu `players` na `matches`
    // (którego ta tabela w ogóle nie ma) — bez tego join'a eksport zawsze wychodził zerowy.
    const [{ data: regs }, { data: matches }] = await Promise.all([
      supabase.from("match_registrations").select("*").eq("player_id", user.id),
      supabase.from("matches").select("id, price_per_player")
    ])

    const priceMap: Record<string, number> = {}
    matches?.forEach((m: any) => { priceMap[m.id] = Number(m.price_per_player || 25) })

    const myMatchesCount = regs?.length || 0
    const totalSpent = (regs || []).reduce((sum: number, r: any) => {
      return sum + (r.is_paid ? (priceMap[r.match_id] || 25) : 0)
    }, 0)

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
    <div className="flex min-h-screen bg-[#F5F6FA] text-[#14181F]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(640px circle at 10% -8%, rgba(44,75,255,0.07), transparent 60%), radial-gradient(520px circle at 92% 16%, rgba(255,210,63,0.10), transparent 55%), radial-gradient(760px circle at 45% 100%, rgba(0,196,140,0.05), transparent 60%)"
          }}
        />

        {/* Header — ta strona wcześniej w ogóle go nie miała */}
        <header className="sticky top-0 z-30 flex items-center justify-end border-b border-slate-200 bg-white/90 pl-16 pr-6 py-3 lg:px-6 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSupportModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>
            <NotificationsBell onNotificationClick={(notif: NotificationItem) => {}} />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Ustawienia i Preferencje</h1>
              <p className="text-xs font-medium text-slate-500">Zarządzaj swoimi danymi zawodnika, powiadomieniami oraz kontem.</p>
            </div>
          </div>

          {/* Sekcja 1: Dane Profilowe */}
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2C4BFF]/10 text-[#2C4BFF] border border-[#2C4BFF]/20">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className={cn(display.className, "text-sm font-bold text-slate-900")}>Profil Zawodnika</h2>
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="gap-2 rounded-xl text-xs font-bold bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white cursor-pointer active:scale-[0.97] shadow-md shadow-[#2C4BFF]/20">
                  <Save className="h-4 w-4" />
                  Zapisz profil zawodnika
                </Button>
              </div>
            </form>
          </div>

          {/* Sekcja 2: Dane do Szybkich Wpłat (dla Admina) */}
          {isAdmin && (
            <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-75 fill-mode-both">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00C48C]/10 text-[#00875F] border border-[#00C48C]/20">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={cn(display.className, "text-sm font-bold text-slate-900")}>Dane do Rozliczeń i Wpisowego</h2>
                  <p className="text-xs text-slate-400 font-medium">Numer BLIK wyświetlany graczom w oknie „Postaw kawę” na tym urządzeniu</p>
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
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 focus:bg-white transition-all"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-mono text-slate-900 outline-none focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="outline" className="gap-2 rounded-xl text-xs font-bold border-slate-200 cursor-pointer active:scale-[0.97]">
                    <Save className="h-4 w-4 text-[#00875F]" />
                    Zapisz dane do wpłat
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Sekcja 3: Bezpieczeństwo i Hasło */}
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-150 fill-mode-both">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5A5F]/10 text-[#E0454A] border border-[#FF5A5F]/20">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className={cn(display.className, "text-sm font-bold text-slate-900")}>Bezpieczeństwo i Hasło</h2>
                <p className="text-xs text-slate-400 font-medium">Zmień swoje hasło dostępowe do aplikacji</p>
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#FF5A5F]/10 p-3 text-xs font-bold text-[#E0454A] border border-[#FF5A5F]/25 animate-in fade-in slide-in-from-top-1">
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#FF5A5F] focus:ring-2 focus:ring-[#FF5A5F]/20 focus:bg-white transition-all"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#FF5A5F] focus:ring-2 focus:ring-[#FF5A5F]/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="outline" className="gap-2 rounded-xl text-xs font-bold border-slate-200 cursor-pointer active:scale-[0.97]">
                  <KeyRound className="h-4 w-4 text-[#E0454A]" />
                  Zmień hasło
                </Button>
              </div>
            </form>
          </div>

          {/* Sekcja 4: Powiadomienia */}
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-200 fill-mode-both">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7A5CFF]/10 text-[#7A5CFF] border border-[#7A5CFF]/20">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className={cn(display.className, "text-sm font-bold text-slate-900")}>Kanały Powiadomień</h2>
                <p className="text-xs text-slate-400 font-medium">Wybierz, w jaki sposób chcesz otrzymywać powiadomienia meczowe</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Powiadomienia e-mail o meczach</p>
                  <p className="text-[11px] text-slate-400">Otrzymuj zaproszenie natychmiast po utworzeniu nowego meczu</p>
                </div>
                <Toggle checked={notifyEmail} onChange={handleToggleNotifyEmail} />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="font-bold text-slate-900">Powiadomienia Push w przeglądarce</p>
                  <p className="text-[11px] text-slate-400">Szybki alert w aplikacji w przypadku odwołania spotkania</p>
                </div>
                <Toggle checked={notifyPush} onChange={handleToggleNotifyPush} />
              </div>
            </div>
          </div>

          {/* Sekcja 5: Eksport Własnych Danych */}
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-300 fill-mode-both">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Download className="h-4 w-4 text-[#2C4BFF]" />
                Eksport Twoich danych zawodnika
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Pobierz zestawienie swoich rozegranych meczów i poniesionych opłat w formacie CSV.</p>
            </div>
            <Button onClick={exportMyData} variant="outline" className="rounded-xl gap-2 text-xs font-bold border-slate-200 cursor-pointer active:scale-[0.97] shrink-0">
              <Download className="h-4 w-4 text-[#2C4BFF]" />
              Pobierz Moje Statystyki (.CSV)
            </Button>
          </div>

        </main>
      </div>

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1120]/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-[#00E0A2]" />
          {toast}
        </div>
      )}
    </div>
  )
}
