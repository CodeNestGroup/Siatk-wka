"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  User,
  Lock,
  Bell,
  CheckCircle2,
  ArrowLeft,
  Save,
  KeyRound,
  Mail,
  Shirt,
  CreditCard,
  Download,
  Smartphone,
  ShieldAlert
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Stany profilowe
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [position, setPosition] = useState("Przyjmujący")
  const [shirtNumber, setShirtNumber] = useState("7")

  // Stany bezpieczeństwa
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Stany płatności (dla admina/organizatora)
  const [blikNumber, setBlikNumber] = useState("+48 600 000 000")
  const [bankAccount, setBankAccount] = useState("12 3456 7890 0000 1111 2222 3333")

  // Powiadomienia
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifySms, setNotifySms] = useState(false)
  const [notifyReminder, setNotifyReminder] = useState(true)

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
        setFullName(activeUser.full_name || (activeUser.email === "admin@admin.pl" ? "Mateusz Podzorski" : ""))
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
      const updatedUser = { ...user, full_name: fullName, email, position, shirtNumber }
      localStorage.setItem("volley_user", JSON.stringify(updatedUser))
      setUser(updatedUser)
      showNotify("Zapisano dane zawodnika!")
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert("Nowe hasła nie są identyczne!")
      return
    }
    if (newPassword.length < 6) {
      alert("Hasło musi mieć co najmniej 6 znaków.")
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      showNotify("Błąd zmiany hasła w bazie Supabase.")
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

  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin"

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8 lg:px-8">

          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Powrót do pulpitu
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Settings className="h-6 w-6 text-primary" />
              Ustawienia i Preferencje
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Zarządzaj swoimi danymi zawodnika, powiadomieniami oraz danymi rozliczeniowymi drużyny.
            </p>
          </div>

          {/* Sekcja 1: Dane Profilowe & Karta Zawodnika */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Profil i Karta Zawodnika</h2>
                <p className="text-xs text-muted-foreground">Dane osobowe oraz pozycja w zespole siatkarskim</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Imię i nazwisko</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="np. Mateusz Podzorski"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Adres e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-input bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pozycja na boisku</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="Przyjmujący">Przyjmujący</option>
                    <option value="Rozgrywający">Rozgrywający</option>
                    <option value="Atakujący">Atakujący</option>
                    <option value="Środkowy">Środkowy</option>
                    <option value="Libero">Libero</option>
                    <option value="Uniwersalny">Uniwersalny / Wszechstronny</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Numer na koszulce</label>
                  <div className="relative">
                    <Shirt className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={shirtNumber}
                      onChange={(e) => setShirtNumber(e.target.value)}
                      placeholder="7"
                      className="w-full rounded-xl border border-input bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="gap-2 rounded-xl">
                  <Save className="h-4 w-4" />
                  Zapisz profil zawodnika
                </Button>
              </div>
            </form>
          </div>

          {/* Sekcja 2: Dane do Szybkich Wpłat (BLIK / Konto) */}
          {isAdmin && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Dane do Rozliczeń i Wpisowego</h2>
                  <p className="text-xs text-muted-foreground">Numer BLIK i konto bankowe wyświetlane graczon przy wpłatach za mecze</p>
                </div>
              </div>

              <form onSubmit={handleSaveFinanceSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telefon do przelewu BLIK</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={blikNumber}
                        onChange={(e) => setBlikNumber(e.target.value)}
                        placeholder="+48 600 000 000"
                        className="w-full rounded-xl border border-input bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Numer konta bankowego (IBAN)</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="00 0000 0000 0000 0000 0000 0000"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="outline" className="gap-2 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                    <Save className="h-4 w-4" />
                    Zapisz dane do wpłat
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Sekcja 3: Bezpieczeństwo i Hasło */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Bezpieczeństwo i Hasło</h2>
                <p className="text-xs text-muted-foreground">Zmień swoje hasło dostępowe do aplikacji</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nowe hasło</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Powtórz nowe hasło</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="outline" className="gap-2 rounded-xl">
                  <KeyRound className="h-4 w-4" />
                  Zmień hasło
                </Button>
              </div>
            </form>
          </div>

          {/* Sekcja 4: Powiadomienia */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Kanały Powiadomień</h2>
                <p className="text-xs text-muted-foreground">Wybierz, w jaki sposób chcesz otrzymywać powiadomienia meczowe</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Powiadomienia e-mail o meczach</p>
                  <p className="text-xs text-muted-foreground">Otrzymuj zaproszenie natychmiast po utworzeniu nowego meczu</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary/30 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Powiadomienia SMS / Pilne powiadomienia</p>
                  <p className="text-xs text-muted-foreground">Szybki alert na telefon w przypadku odwołania spotkania</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary/30 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Przypomnienia o nieopłaconych składkach</p>
                  <p className="text-xs text-muted-foreground">Przypomnienie 24h przed meczem o braku wpłaty BLIK</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyReminder}
                  onChange={(e) => setNotifyReminder(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary/30 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Sekcja 5: Eksport Danych / Eksport do CSV */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Eksport danych zespołu
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pobierz historię meczów i listę obecności zawodników w formacie JSON / CSV.</p>
            </div>
            <Button variant="secondary" onClick={() => showNotify("Wygenerowano raport danych zespołu!")} className="rounded-xl gap-2 text-xs">
              Pobierz Raport (.CSV)
            </Button>
          </div>

        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
