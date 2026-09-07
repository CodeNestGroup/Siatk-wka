"use client"

/**
 * Ustawienia i Preferencje (/settings)
 *
 * Co to jest: Strona łącząca profil zawodnika (dawniej osobna strona /profile) z ustawieniami
 * konta w jedną zakładkę — edycja danych osobowych, zgody na powiadomienia push, zmiana hasła,
 * eksport własnych statystyk do CSV oraz (tylko dla admina) zablokowana na razie sekcja
 * rozliczeń/wpisowego.
 * Renderuje: header z dzwoneczkiem powiadomień i (na desktopie) przyciskiem "Postaw kawę" ->
 * karta profilowa w stylu "biletu" (inicjały, rola, e-mail) -> trzy kafelki szybkich statystyk
 * (status w zespole, rozegrane mecze, data dołączenia) -> formularz danych profilowych ->
 * sekcja powiadomień push -> (tylko admin) wyszarzona sekcja "Rozliczenia i Wpisowe" (Wkrótce)
 * -> formularz zmiany hasła -> informacje systemowe (UUID, rola) -> eksport CSV -> toast
 * potwierdzeń.
 * Kluczowe zależności: `Sidebar`, `NotificationsBell`, `SupportModal` ("Postaw kawę"),
 * `lib/push` (`isPushSupported`, `getExistingPushSubscription`, `subscribeToPush`,
 * `unsubscribeFromPush` — rejestracja urządzenia w Web Push), `lib/supabase` (RPC
 * `set_player_password`, tabele `players`/`match_registrations`/`matches`).
 * Dane z Supabase: tabela `players` (`phone`, `created_at`, `player_status_id`, `full_name`,
 * `email` — odczyt i zapis przy edycji profilu), `match_registrations` (`match_id`,
 * `player_id`, `is_paid` — do liczenia rozegranych meczów i eksportu CSV), `matches` (`id`,
 * `date`, `status_id`, `is_settled`, `price_per_player` — do wyznaczenia, które mecze są
 * "rozegrane" i ile kosztowały), RPC `set_player_password(player_id, new_password)` (hasło
 * hashowane automatycznie triggerem w bazie, patrz supabase/password-hashing-migration.sql).
 * Uwagi: Autoryzacja jest własna (bez Supabase Auth) — sesja to obiekt w localStorage pod
 * kluczem `volley_user`. `isAdmin` sprawdza `email === "admin@admin.pl" || role === "admin" ||
 * is_admin || role_id === 1`. Dane do wpłat BLIK/konto bankowe w sekcji admina trzymane
 * tymczasowo w localStorage (`volley_blik_display`, `volley_bank_account`) — świadomie
 * prowizoryczne rozwiązanie do czasu decyzji o realnym module rozliczeń, pola są `disabled`.
 * Definicja "mecz rozegrany" musi być identyczna jak w app/stats/page.tsx (patrz komentarz
 * przy `playedMatchesCount` niżej) — inaczej liczniki na obu stronach się rozjadą.
 */

import { useState, useEffect } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  Settings,
  User,
  Lock,
  CheckCircle2,
  Save,
  KeyRound,
  Mail,
  CreditCard,
  Download,
  Smartphone,
  AlertCircle,
  Bell,
  BellOff,
  Coffee,
  Trophy,
  Calendar,
  Shield,
  IdCard
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isPushSupported, getExistingPushSubscription, subscribeToPush, unsubscribeFromPush } from "@/lib/push"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

// Nominatiw, nie dopełniacz ("Sierpień 2026", nie "Sierpnia 2026") — miesiąc tu stoi sam,
// bez dnia przed sobą, więc gramatycznie to inny przypadek niż w hero na stronie głównej.
const MONTHS_NOMINATIVE_PL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"]

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // ────────────────────────────────────────────────────────────────
  // POWIADOMIENIA PUSH — stan zgody przeglądarki + handler włącz/wyłącz. Realna wersja
  // dawnych martwych przełączników "Kanałów Powiadomień" — faktycznie rejestruje/wyrejestrowuje
  // urządzenie w Web Push (lib/push.ts).
  // ────────────────────────────────────────────────────────────────
  // Powiadomienia push — "checking" dopóki nie sprawdzimy realnego stanu przeglądarki,
  // żeby nie mrugnąć złym przyciskiem na ułamek sekundy przy pierwszym renderze.
  const [pushStatus, setPushStatus] = useState<"checking" | "unsupported" | "denied" | "enabled" | "disabled">("checking")
  const [isTogglingPush, setIsTogglingPush] = useState(false)

  useEffect(() => {
    (async () => {
      if (!isPushSupported()) { setPushStatus("unsupported"); return }
      if (Notification.permission === "denied") { setPushStatus("denied"); return }
      const sub = await getExistingPushSubscription()
      setPushStatus(sub ? "enabled" : "disabled")
    })()
  }, [])

  async function handleTogglePush() {
    if (!user?.id || isTogglingPush) return
    setIsTogglingPush(true)

    if (pushStatus === "enabled") {
      await unsubscribeFromPush()
      setPushStatus("disabled")
      showNotify("Powiadomienia push wyłączone na tym urządzeniu")
    } else {
      const ok = await subscribeToPush(user.id)
      if (ok) {
        setPushStatus("enabled")
        showNotify("Powiadomienia push włączone na tym urządzeniu!")
      } else {
        setPushStatus(Notification.permission === "denied" ? "denied" : "unsupported")
        showNotify("Nie udało się włączyć — sprawdź zgody powiadomień w przeglądarce")
      }
    }

    setIsTogglingPush(false)
  }

  // ────────────────────────────────────────────────────────────────
  // STAN PROFILU I KARTY PROFILOWEJ — dane osobowe do formularza edycji oraz liczby
  // wyświetlane na karcie-bilecie i kafelkach statystyk (dociągane z bazy w useEffect niżej).
  // ────────────────────────────────────────────────────────────────
  // Stany profilowe
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  // Karta profilowa (dawniej osobna strona /profile, teraz połączona z Ustawieniami w jedną
  // zakładkę). "Bilans rozliczeń" celowo nie wraca — rozliczenia finansowe są wstrzymane
  // (patrz sekcja "Rozliczenia i Wpisowe" niżej), więc pokazywanie kwoty byłoby mylące.
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [playerStatusId, setPlayerStatusId] = useState<number | null>(null)
  const [playedMatchesCount, setPlayedMatchesCount] = useState<number | null>(null)

  // ────────────────────────────────────────────────────────────────
  // STAN BEZPIECZEŃSTWA — pola formularza zmiany hasła (handleChangePassword niżej).
  // ────────────────────────────────────────────────────────────────
  // Stany bezpieczeństwa
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // ────────────────────────────────────────────────────────────────
  // STAN DANYCH DO WPŁAT (TYLKO ADMIN, TYMCZASOWE) — wartości domyślne, nadpisywane w
  // useEffect niżej danymi z localStorage. Pola w JSX są `disabled` (sekcja "Wkrótce"),
  // to jedynie dane zasilające modal "Postaw kawę", nie prawdziwy moduł rozliczeń.
  // ────────────────────────────────────────────────────────────────
  // Stany płatności (dla admina)
  const [blikNumber, setBlikNumber] = useState("+48 600 000 000")
  const [bankAccount, setBankAccount] = useState("12 3456 7890 0000 1111 2222 3333")

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*]).{6,}$/

  // ────────────────────────────────────────────────────────────────
  // POBIERANIE DANYCH UŻYTKOWNIKA — sesja z localStorage (fallback: Supabase Auth, na wypadek
  // starszych sesji), doczytanie świeższych danych zawodnika z `players` oraz wyliczenie
  // liczby faktycznie rozegranych meczów na podstawie `match_registrations` + `matches`.
  // Osobno wczytuje tymczasowe dane BLIK/konto z localStorage (sekcja admina).
  // ────────────────────────────────────────────────────────────────
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

        // localStorage trzyma to, co było w chwili logowania — jeśli admin zmienił numer
        // od tego czasu wprost w bazie, pobieramy świeższą wartość zamiast bazować na cache'u.
        if (activeUser.id) {
          const [{ data: playerRow }, { data: regs }, { data: matches }] = await Promise.all([
            supabase.from("players").select("phone, created_at, player_status_id").eq("id", activeUser.id).maybeSingle(),
            supabase.from("match_registrations").select("match_id").eq("player_id", activeUser.id),
            supabase.from("matches").select("id, date, status_id, is_settled")
          ])

          setPhone(playerRow?.phone ?? activeUser.phone ?? "")
          setJoinedAt(playerRow?.created_at ?? null)
          setPlayerStatusId(playerRow?.player_status_id ?? null)

          // Ta sama definicja "faktycznie rozegrany" co na Statystykach (app/stats/page.tsx) —
          // odwołany mecz nigdy się nie liczy, reszta liczy się jeśli minęła data albo admin
          // ręcznie oznaczył go jako rozliczony/zakończony.
          const todayStr = new Date().toISOString().split("T")[0]
          const matchMap: Record<string, any> = {}
          matches?.forEach((m: any) => { matchMap[m.id] = m })

          const playedCount = (regs || []).filter((reg: any) => {
            const m = matchMap[reg.match_id]
            if (!m) return false
            if (m.status_id === 4) return false
            return m.date < todayStr || m.status_id === 3 || m.is_settled === true
          }).length

          setPlayedMatchesCount(playedCount)
        } else {
          setPhone(activeUser.phone || "")
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

  // ────────────────────────────────────────────────────────────────
  // FUNKCJE POMOCNICZE — toast z komunikatem (auto-znika po 3.5s) i wylogowanie (czyści
  // localStorage/sessionStorage, wywołuje signOut dla porządku i przekierowuje na /login).
  // ────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────
  // ZAPIS PROFILU ZAWODNIKA — aktualizuje `full_name`/`email`/`phone` w tabeli `players` i
  // odświeża lokalną kopię sesji (localStorage["volley_user"]), żeby zmiana była widoczna
  // od razu w całej appce (np. w Sidebarze) bez przelogowania.
  // ────────────────────────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const { error } = await supabase.from("players").update({ full_name: fullName, email, phone: phone.trim() || null }).eq("id", user.id)

    if (error) {
      const isDuplicate = error.code === "23505"
      showNotify(isDuplicate ? "Ta nazwa lub e-mail są już zajęte przez innego zawodnika." : `Błąd zapisu: ${error.message}`)
      return
    }

    const updatedUser = { ...user, full_name: fullName, name: fullName, email, phone: phone.trim() || null }
    localStorage.setItem("volley_user", JSON.stringify(updatedUser))
    setUser(updatedUser)
    showNotify("Zapisano dane zawodnika!")
  }

  // ────────────────────────────────────────────────────────────────
  // ZMIANA HASŁA — walidacja po stronie klienta (zgodność powtórzonego hasła + regex
  // wymogów), a samo hashowanie i zapis idzie przez RPC `set_player_password` (hash liczony
  // triggerem w bazie, przeglądarka nigdy nie widzi hasha).
  // ────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────
  // EKSPORT WŁASNYCH DANYCH DO CSV — liczy własne rozegrane mecze i sumę wpłat na podstawie
  // `match_registrations` + cen z `matches`, generuje plik .csv w przeglądarce (Blob +
  // link.download) i od razu go pobiera, bez zapisywania czegokolwiek po stronie serwera.
  // ────────────────────────────────────────────────────────────────
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

    let csv = "Moje Imię,Rozegrane Mecze,Suma Wydanych Środków (zł)\n"
    csv += `"${fullName}",${myMatchesCount},${totalSpent}\n`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `moje_dane_${fullName.replace(/\s+/g, "_")}.csv`
    link.click()
    showNotify("Pobrano plik z Twoimi statystykami!")
  }

  // ────────────────────────────────────────────────────────────────
  // WYLICZENIA POCHODNE DO RENDERU — rola użytkownika, wyświetlana nazwa i inicjały na kartę
  // profilową, status "aktywny gracz" oraz etykieta miesiąca/roku dołączenia do klubu.
  // ────────────────────────────────────────────────────────────────
  const isAdmin = user?.email === "admin@admin.pl" || user?.role === "admin" || user?.is_admin || user?.role_id === 1

  const displayName = user?.full_name || user?.name || (user?.email === "admin@admin.pl" ? "Mateusz Podzorski" : user?.email) || "Użytkownik"
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "MP"

  // player_status_id bywa puste dla starszych/importowanych kont — tak samo jak w bazie
  // zawodników (app/players/page.tsx), brak wartości traktujemy jako "aktywny", nie "nieaktywny".
  const isActivePlayer = playerStatusId === 1 || playerStatusId === null
  const joinedLabel = (() => {
    if (!joinedAt) return "—"
    const d = new Date(joinedAt)
    if (Number.isNaN(d.getTime())) return "—"
    return `${MONTHS_NOMINATIVE_PL[d.getMonth()]} ${d.getFullYear()}`
  })()

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
        {/* iOS ze statusem "black-translucent" nakłada zegar/baterię/wifi na treść zamiast
            rezerwować dla nich pasek — bez tego paddingu system zasłaniał ikony w nagłówku. */}
        {/* Na telefonie header NIE jest już przyklejony (sticky tylko od sm: w górę) — patrz
            app/page.tsx po pełne wyjaśnienie. */}
        <header
          className="static sm:sticky sm:top-0 z-30 flex items-center justify-end border-b border-slate-200 bg-white/90 pl-16 pr-6 py-3 lg:px-6 backdrop-blur-md shrink-0"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-3">
            {/* Tylko na desktopie — na telefonie ma zostać wyłącznie dzwoneczek. */}
            <button
              onClick={() => setShowSupportModal(true)}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>
            <NotificationsBell playerId={user?.id} onNotificationClick={(notif: NotificationItem) => {}} />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8 pb-24 lg:pb-8">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Ustawienia i Preferencje</h1>
              <p className="text-xs font-medium text-slate-500">Twój profil, dane zawodnika, powiadomienia oraz konto — wszystko w jednym miejscu.</p>
            </div>
          </div>

          {/* KARTA PROFILOWA — dawniej osobna strona /profile, teraz połączona tutaj na
              wyraźną prośbę: jedna zakładka zamiast dwóch pokrywających się stron. Bilet
              w stylistyce "Under the Lights", bez przycisku "Edytuj konto" (byłby bez sensu —
              formularz edycji jest tuż niżej, na tej samej stronie). */}
          <div
            className="relative overflow-hidden rounded-[28px] text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
            style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
          >
            <div className="absolute inset-0 pointer-events-none" style={netPattern} />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2C4BFF]/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#FFD23F]/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-5 p-6 sm:p-8">
              <div className={cn(score.className, "flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-white font-semibold text-2xl")}>
                {initials}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2C4BFF]/20 border border-[#2C4BFF]/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#8FA1FF]">
                  <IdCard className="h-3 w-3 text-[#FFD23F]" />
                  {isAdmin ? "Administrator" : "Zawodnik ESCO"}
                </span>
                <h2 className={cn(display.className, "text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5 truncate")}>{displayName}</h2>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mt-2">
                  <Mail className="h-3.5 w-3.5 text-[#FFD23F]" />
                  {user?.email || "brak-emaila@esco.pl"}
                </p>
              </div>
            </div>
          </div>

          {/* KAFELKI SZYBKICH STATYSTYK — liczone z bazy, nie wpisane na sztywno. "Bilans
              rozliczeń" celowo nie wraca — rozliczenia finansowe są wstrzymane (patrz sekcja
              "Rozliczenia i Wpisowe" niżej), więc kwota tutaj byłaby myląca. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", isActivePlayer ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/20" : "bg-slate-100 text-slate-400 border-slate-200")}>
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status w zespole</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{isActivePlayer ? "Aktywny Gracz" : "Nieaktywny"}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2C4BFF]/10 text-[#2C4BFF] border border-[#2C4BFF]/20">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rozegrane mecze</p>
                <p className={cn(score.className, "text-sm font-semibold text-slate-900 mt-0.5")}>
                  {playedMatchesCount === null ? "…" : playedMatchesCount} w tym sezonie
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7A5CFF]/10 text-[#7A5CFF] border border-[#7A5CFF]/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dołączono</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{joinedLabel}</p>
              </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Numer telefonu</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="np. 500 100 001"
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

          {/* Powiadomienia push — realna wersja tego, co wcześniej było martwymi przełącznikami
              "Kanały Powiadomień" (usunięte, bo nic nie robiły). Teraz faktycznie rejestrują
              urządzenie w Web Push, więc telefon/desktop dostaje prawdziwe powiadomienie
              systemowe przy nowym meczu/ogłoszeniu/wpłacie — nawet gdy appka jest zamknięta. */}
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-75 fill-mode-both">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl border",
                pushStatus === "enabled" ? "bg-[#2C4BFF]/10 text-[#2C4BFF] border-[#2C4BFF]/20" : "bg-slate-100 text-slate-400 border-slate-200"
              )}>
                {pushStatus === "enabled" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </div>
              <div>
                <h2 className={cn(display.className, "text-sm font-bold text-slate-900")}>Powiadomienia push</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Nowy mecz, ogłoszenie albo wpłata — prosto na telefon.</p>
              </div>
            </div>

            {pushStatus === "unsupported" && (
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Ta przeglądarka nie obsługuje powiadomień push. Na iPhonie: najpierw dodaj appkę do ekranu głównego
                (przycisk Udostępnij → <strong className="text-slate-700">Dodaj do ekranu głównego</strong>), otwórz ją stamtąd,
                a potem wróć tu ponownie.
              </p>
            )}

            {pushStatus === "denied" && (
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Zablokowałeś/aś powiadomienia dla tej strony w przeglądarce — żeby je włączyć, zmień to ręcznie
                w ustawieniach przeglądarki (ikona kłódki przy adresie strony) i wróć tutaj.
              </p>
            )}

            {(pushStatus === "enabled" || pushStatus === "disabled") && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-semibold text-slate-600">
                  {pushStatus === "enabled" ? "Włączone na tym urządzeniu." : "Wyłączone na tym urządzeniu."}
                </p>
                <Button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={isTogglingPush}
                  className={cn(
                    "gap-2 rounded-xl text-xs font-bold cursor-pointer active:scale-[0.97] shadow-md",
                    pushStatus === "enabled"
                      ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none"
                      : "bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white shadow-[#2C4BFF]/20"
                  )}
                >
                  {pushStatus === "enabled" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {isTogglingPush ? "Chwila…" : pushStatus === "enabled" ? "Wyłącz powiadomienia" : "Włącz powiadomienia"}
                </Button>
              </div>
            )}
          </div>

          {/* Sekcja 2: Rozliczenia i Wpisowe — cała sekcja "Wkrótce". Prawdziwy sposób rozliczania
              wpłat (BLIK do doraźnych "Postaw kawę" czy realne rozliczenia meczowe) czeka na
              decyzję po rozmowie z szefem — do tego czasu nic tu nie edytujemy, żeby nie sugerować
              gotowej funkcji rozliczeń, zanim faktycznie taka powstanie. */}
          {isAdmin && (
            <div className="rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-6 opacity-70 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-75 fill-mode-both">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={cn(display.className, "text-sm font-bold text-slate-500 flex items-center gap-2")}>
                    Rozliczenia i Wpisowe
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-400">Wkrótce</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Sposób rozliczania wpłat jest jeszcze w przygotowaniu</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Telefon do przelewu BLIK</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      value={blikNumber}
                      disabled
                      className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Numer konta bankowego (IBAN)</label>
                  <input
                    type="text"
                    value={bankAccount}
                    disabled
                    placeholder="00 0000 0000 0000 0000 0000 0000"
                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-mono text-slate-400 outline-none"
                  />
                </div>
              </div>
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

          {/* Informacje systemowe */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
              <Shield className="h-3.5 w-3.5 text-slate-300" />
              Informacje systemowe
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Surowy UUID to czysty szum na telefonie — nikt go tam nie odczytuje ani nie
                  kopiuje z małego ekranu. Zostaje widoczny od sm: wzwyż, gdzie i tak jest miejsce. */}
              <div className="hidden sm:block p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-bold block mb-0.5">Identyfikator użytkownika</span>
                <span className="font-mono text-slate-900 font-bold block truncate">{user?.id || "local-user-id"}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-bold block mb-0.5">Rola w systemie ESCO VolleyManager</span>
                <span className="font-bold text-slate-900 block">{isAdmin ? "Pełne uprawnienia (Administrator)" : "Standardowe (Zawodnik)"}</span>
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
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1120]/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-[#00E0A2]" />
          {toast}
        </div>
      )}
    </div>
  )
}
