"use client"

import { useState } from "react"
import { Trophy, Lock, Mail, ArrowRight, Shield, AlertCircle, UserPlus, User, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")

  // Stany formularzy
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // LOGOWANIE
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    const { data: player, error } = await supabase
      .from("players")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle()

    if (error) {
      setErrorMessage("Błąd połączenia z bazą danych.")
      setIsLoading(false)
      return
    }

    if (!player) {
      setErrorMessage("Nie znaleziono użytkownika o podanym e-mailu.")
      setIsLoading(false)
      return
    }

    // Weryfikacja hasła
    if (player.password !== password) {
      setErrorMessage("Nieprawidłowe hasło.")
      setIsLoading(false)
      return
    }

    // SPRAWDZENIE ZATWIERDZENIA PRZEZ ADMINA
    if (player.role === "pending") {
      setErrorMessage("Twoje konto oczekuje na zatwierdzenie przez Administratora.")
      setIsLoading(false)
      return
    }

    const isMateusz =
      player.full_name?.toLowerCase().includes("mateusz podzorski") ||
      player.email?.toLowerCase().includes("mateusz")

    const userToSave = {
      id: player.id,
      name: player.full_name,
      full_name: player.full_name,
      email: player.email,
      phone: player.phone,
      role: isMateusz ? "admin" : player.role || "user",
      is_admin: isMateusz || player.role === "admin"
    }

    localStorage.setItem("volley_user", JSON.stringify(userToSave))
    window.location.href = "/"
  }

  // REJESTRACJA
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()

    // 1. Sprawdzamy czy e-mail już istnieje w bazie
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle()

    if (existing) {
      setErrorMessage("Użytkownik o podanym adresie e-mail już istnieje.")
      setIsLoading(false)
      return
    }

    // 2. Dodajemy gracza ze statusem "pending"
    const { error } = await supabase
      .from("players")
      .insert([
        {
          full_name: cleanName,
          email: cleanEmail,
          password: password,
          role: "pending" // Wymaga zatwierdzenia!
        }
      ])

    if (error) {
      setErrorMessage(`Błąd rejestracji: ${error.message}`)
    } else {
      setSuccessMessage("Konto zostało utworzone! Wysłano prośbę o zatwierdzenie do Administratora.")
      setMode("login")
      setPassword("")
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 text-slate-900">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            VolleyManager
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            {mode === "login" ? "Zaloguj się do swojego konta" : "Utwórz konto zawodnika"}
          </p>
        </div>

        {/* Karta */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 space-y-5">

          {/* Przełącznik Logowanie / Rejestracja */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => { setMode("login"); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all ${mode === "login" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
            >
              Logowanie
            </button>
            <button
              onClick={() => { setMode("register"); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all ${mode === "register" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
            >
              Rejestracja
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  Adres E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="np. mateusz@volley.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Hasło
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 py-3 font-extrabold text-xs text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isLoading ? "Weryfikowanie..." : "Zaloguj się"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Imię i Nazwisko
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Jan Kowalski"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  Adres E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="np. jan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Utwórz Hasło
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 znaków"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 py-3 font-extrabold text-xs text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isLoading ? "Tworzenie konta..." : "Zarejestruj się"}
                <UserPlus className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <Shield className="h-3.5 w-3.5 text-slate-400" />
          ESCO Volleyball System
        </div>

      </div>
    </div>
  )
}
