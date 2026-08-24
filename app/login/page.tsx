"use client"

import { useState } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import { Volleyball, Lock, Mail, ArrowRight, Shield, AlertCircle, UserPlus, User, Phone, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Turnstile } from "@marsidev/react-turnstile"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

function perforationH(color: string): React.CSSProperties {
  return { backgroundImage: `repeating-linear-gradient(to right, ${color} 0 5px, transparent 5px 12px)` }
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*]).{6,}$/

  // LOGOWANIE
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    // Weryfikacja hasła dzieje się w całości wewnątrz Postgresa (funkcja `verify_login`) —
    // przeglądarka nigdy nie pobiera ani nie porównuje hasła/hasha samodzielnie.
    // Patrz supabase/password-hashing-migration.sql.
    const { data: result, error } = await supabase.rpc("verify_login", {
      p_email: cleanEmail,
      p_password: password
    })

    if (error) {
      setErrorMessage("Błąd połączenia z bazą danych.")
      setIsLoading(false)
      return
    }

    if (result?.error === "not_found") {
      setErrorMessage("Nie znaleziono użytkownika o podanym e-mailu.")
      setIsLoading(false)
      return
    }

    if (result?.error === "wrong_password") {
      setErrorMessage("Nieprawidłowe hasło.")
      setIsLoading(false)
      return
    }

    if (result?.error === "pending") {
      setErrorMessage("Twoje konto oczekuje na zatwierdzenie przez Administratora.")
      setIsLoading(false)
      return
    }

    const player = result

    const isMateusz =
      player.full_name?.toLowerCase().includes("mateusz podzorski") ||
      player.email?.toLowerCase().includes("mateusz")

    const userToSave = {
      id: player.id,
      name: player.full_name,
      full_name: player.full_name,
      email: player.email,
      phone: player.phone,
      role: isMateusz ? "admin" : (player.role_id === 1 ? "admin" : "user"),
      is_admin: isMateusz || player.role_id === 1
    }

    localStorage.setItem("volley_user", JSON.stringify(userToSave))
    window.location.href = "/"
  }

  // REJESTRACJA Z TURNSTILE
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!captchaToken) {
      setErrorMessage("Potwierdź, że nie jesteś robotem (przejdź weryfikację Turnstile).")
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()

    if (password !== confirmPassword) {
      setErrorMessage("Podane hasła nie są identyczne.")
      return
    }

    if (!passwordRegex.test(password)) {
      setErrorMessage("Hasło musi zawierać min. 6 znaków, co najmniej jedną wielką literę i znak specjalny (!@#$&*).")
      return
    }

    setIsLoading(true)

    const { data: existingUser } = await supabase
      .from("players")
      .select("id, email, full_name")
      .or(`email.eq.${cleanEmail},full_name.ilike.${cleanName}`)
      .maybeSingle()

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        setErrorMessage("Użytkownik o podanym adresie e-mail już istnieje.")
      } else {
        setErrorMessage("Zawodnik o takim imieniu i nazwisku już istnieje w bazie.")
      }
      setIsLoading(false)
      return
    }

    const { error } = await supabase
      .from("players")
      .insert([
        {
          full_name: cleanName,
          email: cleanEmail,
          phone: phone.trim() || null,
          password: password,
          role_id: 3 // pending w players_role
        }
      ])

    if (error) {
      setErrorMessage(`Błąd rejestracji: ${error.message}`)
    } else {
      setSuccessMessage("Konto zostało utworzone! Wysłano prośbę o zatwierdzenie do Administratora.")

      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setFullName("")
      setPhone("")
      setCaptchaToken(null)
      setMode("login")
    }

    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4 text-slate-900 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(640px circle at 10% -8%, rgba(44,75,255,0.07), transparent 60%), radial-gradient(520px circle at 92% 16%, rgba(255,210,63,0.10), transparent 55%), radial-gradient(760px circle at 45% 100%, rgba(0,196,140,0.05), transparent 60%)"
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
        {/* KARTA-BILET — ciemny nagłówek + perforacja + biały formularz, ten sam język co reszta appki */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">

          <div
            className="relative overflow-hidden px-6 sm:px-8 pt-8 pb-7 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2C4BFF]/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2C4BFF] text-white shadow-lg shadow-[#2C4BFF]/30">
                <Volleyball className="h-7 w-7" />
              </div>
              <h1 className={cn(display.className, "text-2xl font-bold tracking-tight text-white pt-1")}>VolleyManager</h1>
              <p className={cn(score.className, "text-[11px] uppercase tracking-[0.2em] text-slate-400")}>
                {mode === "login" ? "Zaloguj się do swojego konta" : "Utwórz konto zawodnika"}
              </p>
            </div>

            {/* Perforacja — "oderwij bilet", sygnatura projektu, ta sama co w hero na dashboardzie */}
            <div className="relative z-10 mx-auto mt-6 h-px w-full max-w-[calc(100%+3rem)]" style={perforationH("rgba(255,255,255,0.18)")} />
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => { setMode("login"); setErrorMessage(null); setSuccessMessage(null); }}
                className={cn(
                  "py-2 rounded-xl transition-all cursor-pointer active:scale-[0.98]",
                  mode === "login" ? "bg-white text-[#2C4BFF] shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Logowanie
              </button>
              <button
                onClick={() => { setMode("register"); setErrorMessage(null); setSuccessMessage(null); }}
                className={cn(
                  "py-2 rounded-xl transition-all cursor-pointer active:scale-[0.98]",
                  mode === "register" ? "bg-white text-[#2C4BFF] shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Rejestracja
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#FF5A5F]/10 p-3 text-xs font-bold text-[#E0454A] border border-[#FF5A5F]/25 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#00C48C]/10 p-3 text-xs font-bold text-[#00875F] border border-[#00C48C]/25 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#2C4BFF]" /> Adres E-mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="np. mateusz@volley.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#2C4BFF]" /> Hasło
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-[#2C4BFF] hover:bg-[#1D3AE8] py-3 font-extrabold text-xs text-white shadow-lg shadow-[#2C4BFF]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Weryfikowanie..." : "Zaloguj się"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#2C4BFF]" /> Imię i Nazwisko
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="np. Jan Kowalski"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#2C4BFF]" /> Adres E-mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="np. jan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#2C4BFF]" /> Numer Telefonu
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(opcjonalny)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="np. 123 456 789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#2C4BFF]" /> Utwórz Hasło
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 znaków, 1 wielka litera, 1 znak specjalny"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#2C4BFF]" /> Powtórz Hasło
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Powtórz utworzone hasło"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                  />
                </div>

                {/* TUTAJ WKLEJ SWÓJ SITE KEY Z CLOUDFLARE */}
                <div className="flex justify-center pt-2">
                  <Turnstile
                    siteKey="0x4AAAAAAEJKrr0toLK0qeAv"
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-[#2C4BFF] hover:bg-[#1D3AE8] py-3 font-extrabold text-xs text-white shadow-lg shadow-[#2C4BFF]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Tworzenie konta..." : "Zarejestruj się"}
                  <UserPlus className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <Shield className="h-3.5 w-3.5 text-slate-400" />
          ESCO Volleyball System
        </div>
      </div>
    </div>
  )
}
