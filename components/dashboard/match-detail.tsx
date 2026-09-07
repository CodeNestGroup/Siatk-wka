"use client"

/**
 * Modal szczegółów meczu — skład, płatności, rozliczenie
 *
 * Co to jest: Pełny widok pojedynczego meczu, otwierany w modalu po kliknięciu w kartę
 * meczu na stronie głównej. Pokazuje status składu (ile zapisanych / ilu opłaciło / ile
 * zebrano), pozwala dołączyć/wypisać się z meczu, zarządzać płatnościami i składem
 * (admin), rozliczyć zebraną kasę w Finansach oraz wyeksportować skład na WhatsApp lub
 * dodać mecz do kalendarza.
 * Renderuje: ciemny nagłówek "bilet meczowy" z datą/lokalizacją i przyciskiem "Dodaj do
 * kalendarza" -> karta statusu (skład/opłacono/zebrano) -> blok blokady dla meczu
 * odwołanego lub rozliczonego, albo przycisk "Zatwierdź i rozlicz w Finansach" dla admina
 * -> lista głównego składu (numer, status płatności, usuwanie) -> lista rezerwowa ->
 * przycisk dołącz/wypisz się -> toast + ConfirmDialog na potwierdzenia.
 * Props / kluczowe zależności: `match` (typ `Match` z `lib/data.ts`, rozszerzony o
 * `is_settled`), `onChange` (aktualizuje mecz w widoku nadrzędnym — `app/page.tsx`),
 * `onClose`, `currentUser` (obiekt sesji z localStorage). Współpracuje z `mainRoster`/
 * `waitlist`/`isMatchCancelled` (`lib/data.ts` — dzielą graczy na skład/rezerwę wg
 * `capacity` i sprawdzają status odwołania meczu), `addMatchToCalendar`/`formatDatePL`
 * (`lib/utils.ts`), `notifyPush` (`lib/push.ts` — powiadomienie po rozliczeniu meczu),
 * `ConfirmDialog` (potwierdzenia przed wypisaniem gracza).
 * Dane z Supabase: `matches` (update `is_settled`), `match_registrations` (`is_paid`
 * toggle, insert przy dołączeniu, delete przy wypisaniu — klucz `match_id` + `player_id`),
 * `transactions` (insert wpisu przychodu przy rozliczeniu meczu).
 * Uwagi: Renderowany przez `app/page.tsx` wewnątrz komponentu `Modal` po kliknięciu w
 * mecz — to NIE jest samodzielna trasa. `isAdmin` liczony lokalnie, tymi samymi regułami
 * co wszędzie indziej (`role === "admin" || is_admin || role_id === 1 || email ===
 * "admin@admin.pl"`). Zatwierdzenie w Finansach księguje TYLKO realnie opłaconą kwotę
 * (na podstawie `is_paid`), nie pełną wartość składu — patrz komentarz przy
 * `handleSettleAndSave`. Wypisanie samego siebie jest zablokowane <2h przed startem meczu
 * (admin może wypisać kogoś innego zawsze).
 */

import { useState } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  X,
  Calendar,
  MapPin,
  Wallet,
  CheckCircle2,
  Lock,
  Receipt,
  UserPlus,
  UserMinus,
  Trash2,
  Clock,
  MessageCircle,
  CalendarPlus,
  Ban
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"
import { type Match, mainRoster, waitlist, isMatchCancelled } from "@/lib/data"
import { cn, formatDatePL, addMatchToCalendar } from "@/lib/utils"
import { notifyPush } from "@/lib/push"
import { supabase } from "@/lib/supabase"

// ────────────────────────────────────────────────────────────────
// TOKENY WIZUALNE — fonty i kolory "Under the Lights", te same co w dashboardzie /
// sidebarze. Docelowo warto wynieść display/score do wspólnego /lib/fonts.ts.
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const YELLOW = "#FFD23F"
const COBALT = "#2C4BFF"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

// ────────────────────────────────────────────────────────────────
// TYP PROPS — kontrakt z rodzicem (app/page.tsx): mecz do wyświetlenia, callbacki
// aktualizacji/zamknięcia oraz sesja zalogowanego użytkownika
// ────────────────────────────────────────────────────────────────
type MatchDetailProps = {
  match: Match & { is_settled?: boolean }
  onChange: (updated: Match) => void
  onClose: () => void
  currentUser: any
}

export function MatchDetail({ match, onChange, onClose, currentUser }: MatchDetailProps) {
  // ────────────────────────────────────────────────────────────────
  // UPRAWNIENIA I DANE WYPROWADZONE Z PROPS — rola usera, podział skład/rezerwy,
  // liczniki płatności, status odwołania/rozliczenia i blokada czasowa wypisania
  // ────────────────────────────────────────────────────────────────
  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.is_admin ||
    currentUser?.role_id === 1 ||
    currentUser?.email === "admin@admin.pl"

  const rawRoster = mainRoster(match)
  const rawReserves = waitlist(match)
  const capacity = Number(match.capacity || match.max_players || 12)
  const price = Number(match.price_per_player || 25)

  // Sortowanie: Zalogowany użytkownik (Ty) ZAWSZE na pierwszym miejscu
  const sortedRoster = [...rawRoster].sort((a: any, b: any) => {
    const isUserA = a.id === currentUser?.id || a.email === currentUser?.email
    const isUserB = b.id === currentUser?.id || b.email === currentUser?.email
    if (isUserA) return -1
    if (isUserB) return 1
    return 0
  })

  // Rezerwy NIE dostają sortowania "Ty pierwszy" jak skład główny — tu kolejność DOSŁOWNIE
  // znaczy "kto wchodzi następny, gdy zwolni się miejsce", więc podbijanie siebie na górę
  // fałszowałoby realną pozycję w kolejce. "Ty" i tak jest widoczne dzięki odznace przy graczu
  // niżej — nie trzeba do tego zmieniać kolejności.

  // Rozróżnienie "ile faktycznie wpłacone" (na podstawie realnych flag is_paid) od
  // "ile powinno wpłynąć w sumie, gdyby wszyscy zapłacili" — settle księguje TO PIERWSZE.
  // Wcześniej księgowało drugie (pełną kwotę bez względu na realne wpłaty), przez co kasa
  // klubu w Finansach "zarabiała" na papierze pieniądze, których nikt nigdy nie wpłacił.
  const paidRosterCount = rawRoster.filter((p: any) => p.paid || p.is_paid).length
  const unpaidRosterCount = rawRoster.length - paidRosterCount
  const totalCollectedSoFar = paidRosterCount * price
  // Ile z opłaconych miejsc pokryto z wcześniej wpłaconego depozytu (Nadpłaty Graczy w
  // Finansach) zamiast świeżą gotówką za TEN konkretny mecz. Gotówka za depozyt wpłynęła do
  // kasy klubu już w momencie doładowania — licząc ją jeszcze raz przy rozliczaniu TEGO meczu,
  // zdublowalibyśmy wpływy w Finansach. `freshCashCount` to jedyna część, którą faktycznie
  // trzeba dopiero zaksięgować.
  const creditCoveredCount = rawRoster.filter((p: any) => (p.paid || p.is_paid) && p.paid_from_credit).length
  const freshCashCount = paidRosterCount - creditCoveredCount
  const freshCashToBook = freshCashCount * price
  const isSettled = !!match.is_settled
  // Mecz odwołany zamraża cały skład — zapisy, wypisy i płatności przestają mieć sens, skoro
  // wydarzenie się nie odbędzie. Wcześniej te akcje działały nadal (widać było tylko czerwony
  // badge "Odwołany" w nagłówku), więc dało się np. dopisać kogoś do meczu, który już nie istnieje.
  // Ta sama reguła co na liście meczów (lib/data.ts) — samo `status_id === 4` nie zawsze
  // wystarcza, stąd fallback po nazwie statusu z joina `matches_status`.
  const isCancelled = isMatchCancelled(match)

  // Zawodnik nie może się już wypisać na mniej niż 2h przed meczem (ani gdy mecz już trwa/minął) —
  // bez tego ktoś mógł zrezygnować dosłownie tuż przed rozpoczęciem, zostawiając drużynę w połowie
  // składu bez czasu na znalezienie zastępstwa. Admin nadal może wypisać KOGOŚ INNEGO w każdej
  // chwili (np. faktyczny brak stawiennictwa) — blokada dotyczy wyłącznie wypisania SAMEGO SIEBIE.
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000
  const matchStartAt = new Date(`${match.date}T${(match.time_start || "19:00:00").slice(0, 8)}`)
  const msUntilMatch = matchStartAt.getTime() - Date.now()
  const canLeaveMatch = msUntilMatch >= TWO_HOURS_MS

  // ────────────────────────────────────────────────────────────────
  // STAN KOMPONENTU — toast, flagi zapisu/dołączania w toku oraz stan modala potwierdzenia
  // ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  const isUserInMatch = match.players?.some(
    (p: any) => p.id === currentUser?.id || p.email === currentUser?.email
  )

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ────────────────────────────────────────────────────────────────
  // POMOCNICZE: EKSPORT SKŁADU I KALENDARZ — budowanie treści wiadomości na WhatsApp
  // oraz dodawanie meczu do kalendarza użytkownika (Google Calendar / .ics)
  // ────────────────────────────────────────────────────────────────
  function buildRosterMessage(): string {
    const listText = rawRoster
      .map((p: any, idx: number) => `${idx + 1}. ${p.full_name || p.name}`)
      .join("\n")

    let fullMessage = `🏐 *Skład na mecz (${formatDatePL(match.date)} - ${match.location})*\n\n${listText}\n\n💰 Zebrano: ${totalCollectedSoFar} PLN`

    if (rawReserves.length > 0) {
      const reservesText = rawReserves
        .map((p: any, idx: number) => `R${idx + 1}. ${p.full_name || p.name}`)
        .join("\n")
      fullMessage += `\n\n⏳ *Lista rezerwowa:*\n${reservesText}`
    }

    return fullMessage
  }

  function handleShareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(buildRosterMessage())}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function handleAddToCalendar() {
    addMatchToCalendar({ id: match.id, title: match.title, date: match.date, timeStart: match.time_start, timeEnd: match.time_end, location: match.location, price })
  }

  // ────────────────────────────────────────────────────────────────
  // AKCJA ADMINA: ROZLICZENIE MECZU W FINANSACH — blokuje mecz do edycji i księguje
  // realnie zebraną kwotę jako przychód w tabeli `transactions`
  // ────────────────────────────────────────────────────────────────
  async function handleSettleAndSave() {
    if (isSettled || isCancelled || rawRoster.length === 0) return
    setIsSaving(true)

    // Zatwierdzenie TYLKO blokuje mecz do edycji — nie zmienia niczyjego realnego statusu
    // wpłaty. Wcześniej wymuszało `is_paid: true` na wszystkich, więc osoba, która faktycznie
    // nie zapłaciła, po zatwierdzeniu wyglądała jakby zapłaciła, a jej dług po prostu znikał.
    const updatedMatch: Match & { is_settled?: boolean } = {
      ...match,
      is_settled: true,
    }

    const { error: matchErr } = await supabase
      .from("matches")
      .update({ is_settled: true })
      .eq("id", match.id)

    if (matchErr) {
      notify(`Błąd zapisu: ${matchErr.message}`)
      setIsSaving(false)
      return
    }

    const collectorName = currentUser?.full_name || currentUser?.name || "Organizator"
    // Mecze utworzone bez własnego tytułu mają `title` ustawiony na surową datę ISO
    // (patrz handleCreateMatch w app/page.tsx) — `match.title || ...` nigdy by tego nie
    // złapało, bo taki tytuł jest "prawdziwy" (nie pusty), tylko akurat brzydki.
    const hasCustomTitle = match.title && match.title !== match.date
    const matchTitle = hasCustomTitle ? match.title : `Zbiórka na hali (${formatDatePL(match.date)})`

    // Gracze opłaceni z depozytu (paid_from_credit) mają swoją gotówkę policzoną w kasie
    // JUŻ przy doładowaniu — księgowanie ich jeszcze raz tutaj zdublowałoby wpływy klubu.
    // Do Finansów trafia tylko `freshCashToBook`: świeża gotówka zebrana za TEN mecz.
    if (freshCashToBook > 0) {
      const newTx = {
        date: new Date().toISOString().split("T")[0],
        title: `Zbiórka z meczu: ${matchTitle}`,
        type: "income",
        amount: freshCashToBook,
        collected_by: collectorName,
        category: "mecz",
      }

      const { error: txErr } = await supabase.from("transactions").insert([newTx])

      if (txErr) {
        notify("Mecz zablokowany, ale wpis do księgi zgłosił błąd.")
        onChange(updatedMatch)
        setIsSaving(false)
        return
      }

      notifyPush({
        title: "Nowa wpłata w kasie",
        body: `${newTx.title} (${freshCashToBook} PLN)`,
        url: "/finances",
        excludePlayerId: currentUser?.id
      })
    }

    const parts: string[] = []
    if (creditCoveredCount > 0) parts.push(`${creditCoveredCount} z depozytu`)
    if (unpaidRosterCount > 0) parts.push(`${unpaidRosterCount} nieopłaconych`)
    const suffix = parts.length > 0 ? ` (${parts.join(", ")})` : ""
    notify(`Pomyślnie rozliczono! +${freshCashToBook} PLN w Finansach${suffix}.`)

    onChange(updatedMatch)
    setIsSaving(false)
  }

  // ────────────────────────────────────────────────────────────────
  // AKCJE: PŁATNOŚCI I ZARZĄDZANIE SKŁADEM — toggle statusu opłacenia (admin), wypisanie
  // gracza (admin lub on sam) oraz dołączenie do meczu (zapis do `match_registrations`)
  // ────────────────────────────────────────────────────────────────
  async function handleTogglePaid(playerId: string, currentlyPaid: boolean) {
    if (isSettled || isCancelled || !isAdmin) return

    const { error } = await supabase
      .from("match_registrations")
      .update({ is_paid: !currentlyPaid })
      .eq("match_id", match.id)
      .eq("player_id", playerId)

    if (!error) {
      const updatedPlayers = (match.players || []).map((p: any) =>
        p.id === playerId ? { ...p, paid: !currentlyPaid, is_paid: !currentlyPaid } : p
      )
      onChange({ ...match, players: updatedPlayers })
    }
  }

  function handleRemovePlayer(playerId: string) {
    if (isSettled || isCancelled) return

    const isSelf = playerId === currentUser?.id
    if (isSelf && !canLeaveMatch) {
      notify("Za późno na wypisanie — zostały mniej niż 2h do meczu. Skontaktuj się z administratorem.")
      return
    }

    setConfirmDialog({
      title: "Wypisać zawodnika?",
      message: "Zawodnik zniknie ze składu tego meczu — będzie mógł zapisać się ponownie, jeśli zostaną wolne miejsca.",
      confirmLabel: "Wypisz",
      danger: true,
      onConfirm: () => performRemovePlayer(playerId)
    })
  }

  async function performRemovePlayer(playerId: string) {
    setConfirmDialog(null)
    const removedPlayer = (match.players || []).find((p: any) => p.id === playerId)

    const { error } = await supabase
      .from("match_registrations")
      .delete()
      .eq("match_id", match.id)
      .eq("player_id", playerId)

    if (!error) {
      // Zwrot do depozytu — jeśli to miejsce było opłacone z Nadpłat Graczy, wypisanie oddaje
      // tę kwotę z powrotem na konto, zamiast bezpowrotnie "zjadać" depozyt za mecz, na który
      // ostatecznie ktoś nie poszedł.
      if (removedPlayer?.paid_from_credit) {
        await supabase.from("player_credit_ledger").insert([{
          player_id: playerId,
          amount: price,
          reason: `Zwrot depozytu — wypisano z meczu ${formatDatePL(match.date)}`,
          match_id: match.id,
          created_by: currentUser?.id
        }])
      }

      const updatedPlayers = (match.players || []).filter((p: any) => p.id !== playerId)
      onChange({ ...match, players: updatedPlayers })
      notify(removedPlayer?.paid_from_credit ? "Wypisano zawodnika, zwrócono depozyt." : "Wypisano zawodnika ze składu.")
    }
  }

  async function handleJoinMatch() {
    // Blokada podwójnego zapisu — bez tego szybki podwójny klik/tap (zanim interfejs zdąży
    // się przerenderować z `isUserInMatch`) potrafił wstawić dwa wiersze rejestracji dla tej
    // samej osoby, bo tabela nie ma unikalnego ograniczenia na parę (mecz, zawodnik).
    if (!currentUser || isSettled || isCancelled || isJoining || isUserInMatch) return
    setIsJoining(true)

    // Jeśli gracz ma wystarczający depozyt (Nadpłaty Graczy w Finansach), zapis od razu
    // pokrywamy z niego zamiast wymagać kolejnej wpłaty gotówką na hali — po to właśnie
    // opłaca się komuś zapłacić z góry za wiele spotkań naraz. Częściowe pokrycie (za mało
    // depozytu na całą składkę) świadomie pomijamy — prościej niż rozliczanie ułamków.
    const { data: balanceRow } = await supabase
      .from("player_balances")
      .select("balance")
      .eq("id", currentUser.id)
      .maybeSingle()

    // Rezerwa nie zużywa depozytu — trafiając na listę rezerwową, gracz wcale nie ma
    // pewności, że zagra (wchodzi tylko jeśli ktoś wypadnie ze składu głównego), więc
    // ściąganie mu za to pieniędzy z góry byłoby nie fair.
    const joiningAsReserve = rawRoster.length >= capacity
    const availableCredit = Number(balanceRow?.balance || 0)
    const useCredit = !joiningAsReserve && availableCredit >= price

    const { error } = await supabase.from("match_registrations").insert([
      {
        match_id: match.id,
        player_id: currentUser.id,
        is_paid: true,
        paid_from_credit: useCredit
      }
    ])

    if (!error) {
      if (useCredit) {
        await supabase.from("player_credit_ledger").insert([{
          player_id: currentUser.id,
          amount: -price,
          reason: `Wykorzystano depozyt — mecz ${formatDatePL(match.date)}`,
          match_id: match.id,
          created_by: currentUser.id
        }])
      }

      const newPlayerObj = {
        id: currentUser.id,
        name: currentUser.full_name || currentUser.name || "Zawodnik",
        full_name: currentUser.full_name || currentUser.name || "Zawodnik",
        email: currentUser.email || "",
        paid: true,
        is_paid: true,
        paid_from_credit: useCredit
      }
      onChange({ ...match, players: [...(match.players || []), newPlayerObj] })
      notify(
        useCredit
          ? `Dołączyłeś do meczu — opłacone z depozytu (zostało ${(availableCredit - price).toFixed(2)} PLN).`
          : "Dołączyłeś do listy na ten mecz!"
      )
    }
    setIsJoining(false)
  }

  return (
    <div className="w-full overflow-hidden rounded-[28px] bg-white shadow-2xl relative my-8 text-slate-900">

      {/* NAGŁÓWEK — ciemny pasek w stylu hero, spina modal z resztą identyfikacji "pod światłami hali" */}
      <div
        className="relative overflow-hidden p-4 sm:p-7 pb-7 text-white"
        style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD23F]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-black uppercase border",
              isSettled
                ? "bg-white/10 text-slate-300 border-white/20"
                : isCancelled
                ? "bg-[#FF5A5F]/15 text-[#FF9296] border-[#FF5A5F]/30"
                : "bg-[#2C4BFF]/20 border-[#2C4BFF]/40 text-[#8FA1FF]"
            )}>
              {isSettled ? "Mecz Rozliczony" : isCancelled ? "Odwołany" : "Skład Meczowy"}
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Składka: {price} PLN / os.</span>
          </div>

          <h2 className={cn(display.className, "text-2xl font-bold text-white pr-10")}>
            {match.title && match.title !== match.date ? match.title : formatDatePL(match.date)}
          </h2>

          <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Calendar className="h-4 w-4 text-[#FFD23F]" /> {formatDatePL(match.date)}
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-4 w-4 text-[#FFD23F]" /> {match.location}
            </span>
          </div>

          {/* Dodaj do kalendarza — sam wybiera Google Calendar albo .ics (Apple/Outlook)
              zależnie od urządzenia, jeden klik, żadnego wyboru */}
          <button
            onClick={handleAddToCalendar}
            title="Kliknij, aby dodać ten mecz do swojego kalendarza"
            aria-label="Dodaj ten mecz do swojego kalendarza"
            className="mt-3.5 flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white transition-all cursor-pointer active:scale-[0.97]"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-[#FFD23F]" />
            Dodaj do kalendarza
          </button>
        </div>
      </div>

      {/* TREŚĆ — karta statusu składu, blokada/przycisk rozliczenia, listy zawodników
          (główny skład + rezerwa) i dolne przyciski dołącz/wypisz się */}
      <div className="p-4 sm:p-7 space-y-5">

        {/* KARTA STATUSU MECZU — jedna karta statusu zamiast trzech osobnych widgetów — wcześniej liczba "X/Y w składzie"
            powtarzała się aż trzy razy (tu, w kafelku "Opłacono" i w nagłówku listy niżej), a
            "Opłacono X/Y" i "Zebrana kasa" to i tak ta sama informacja podana dwoma sposobami.
            Tu wszystko w jednym miejscu: ile w składzie, ile opłaciło, ile zebrano. */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
          <div className="flex justify-between items-baseline text-[11px] font-bold">
            <span className="text-slate-500 uppercase tracking-wide">Skład główny</span>
            <span className={cn(score.className, "text-slate-900 text-base tabular-nums")}>{rawRoster.length} / {capacity}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (rawRoster.length / capacity) * 100)}%`, background: `linear-gradient(90deg, ${COBALT}, ${YELLOW})` }}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-[#00875F]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {paidRosterCount}/{rawRoster.length} opłaciło
            </span>
            <span className={cn(score.className, "text-slate-900 tabular-nums")}>
              {totalCollectedSoFar} <span className="text-[10px] text-slate-400 font-bold">PLN zebrano</span>
            </span>
          </div>
        </div>

        {/* BLOKADA MECZU / PRZYCISK ROZLICZENIA — odwołany mecz zamraża skład (bez tego dało
            się dalej dopisywać/wypisywać graczy i przełączać płatności na spotkaniu, które i
            tak się nie odbędzie), rozliczony pokazuje kłódkę, w pozostałych przypadkach admin
            dostaje przycisk "Zatwierdź i rozlicz w Finansach" */}
        {isCancelled ? (
          <div className="w-full rounded-2xl py-3 font-bold flex items-center justify-center gap-2 bg-[#FF5A5F]/10 text-[#E0454A] border border-[#FF5A5F]/25 text-xs">
            <Ban className="h-4 w-4" />
            Mecz odwołany — zapisy i płatności są zablokowane
          </div>
        ) : isSettled ? (
          <div className="w-full rounded-2xl py-3 font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-500 border border-slate-200 text-xs">
            <Lock className="h-4 w-4 text-[#00875F]" />
            Mecz został już rozliczony i zaksięgowany w finansach
          </div>
        ) : isAdmin && (
          <div className="space-y-1.5">
            <Button
              onClick={handleSettleAndSave}
              disabled={isSaving || rawRoster.length === 0}
              className="w-full rounded-2xl py-3 font-bold gap-2 bg-[#00C48C] hover:bg-[#00A876] text-white shadow-md shadow-[#00C48C]/25 cursor-pointer text-xs"
            >
              <Receipt className="h-4 w-4" />
              {isSaving ? "Księgowanie w finansach..." : `Zatwierdź i rozlicz w Finansach (+${freshCashToBook} PLN)`}
            </Button>
            {/* Widoczne tylko gdy część składu pokryła depozytem — bez tego różnica między
                "300 PLN zebrano" w karcie statusu wyżej a kwotą na tym przycisku (świeża
                gotówka minus depozyty, już wcześniej w kasie) wyglądałaby jak błąd. */}
            {creditCoveredCount > 0 && (
              <p className="text-center text-[10px] font-semibold text-slate-400">
                {creditCoveredCount} {creditCoveredCount === 1 ? "osoba opłaciła" : "osób opłaciło"} z depozytu — ta gotówka jest już w kasie
              </p>
            )}
          </div>
        )}

        {/* LISTA ZAWODNIKÓW — nagłówek z akcją WhatsApp zostaje NA STAŁE widoczny nad listą,
            poza jej scrollowanym kontenerem. Wcześniej był wewnątrz `overflow-y-auto`, więc przy
            przewijaniu składu znikał razem z resztą, a pasek scrolla wizualnie nachodził na napis
            "WhatsApp" po prawej stronie. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Powołani Zawodnicy ({rawRoster.length}/{capacity}):</span>
            <button
              onClick={handleShareWhatsApp}
              className="text-[11px] font-bold text-[#00875F] hover:text-[#00693F] flex items-center gap-1 cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>
          </div>

          {/* Legenda żółtej kropki — na telefonie nie ma najechania myszką, więc sam `title`
              na kropce nikomu by jej nie wytłumaczył. Pokazuje się tylko gdy realnie jest komu
              ją tłumaczyć (ktoś w składzie ma status stałego gracza). */}
          {sortedRoster.some((p: any) => p.is_core_roster) && (
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <span className="h-2 w-2 rounded-full bg-[#FFD23F] ring-1 ring-[#FFD23F]/40 shrink-0" />
              = stały skład
            </p>
          )}

          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {/* SKŁAD GŁÓWNY — numer jak na koszulce, odznaka "Ty", toggle płatności (admin)
                i usuwanie gracza (admin lub on sam) */}
            <div className="space-y-2">
            {rawRoster.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Brak zapisanych graczy w składzie.
              </div>
            ) : (
              sortedRoster.map((player: any, idx: number) => {
                const isCurrent = player.id === currentUser?.id || player.email === currentUser?.email
                const isPaid = !!(player.paid || player.is_paid)
                const canTogglePaid = isAdmin && !isSettled && !isCancelled

                return (
                  <div
                    key={player.id || idx}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border p-3 text-xs transition-all",
                      isCurrent ? "bg-[#2C4BFF]/[0.06] border-[#2C4BFF]/25 text-[#14204D] shadow-sm ring-1 ring-[#2C4BFF]/15" : "bg-slate-50/70 border-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Numer jak na koszulce — Oswald, spójny z resztą systemu. Żółta kropka = stały skład */}
                      <span className="relative">
                        <span className={cn(
                          score.className,
                          "flex h-7 w-7 items-center justify-center rounded-xl text-xs font-semibold tabular-nums",
                          isCurrent ? "bg-[#2C4BFF] text-white" : "bg-slate-200 text-slate-700"
                        )}>
                          {idx + 1}
                        </span>
                        {player.is_core_roster && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FFD23F] ring-2 ring-white" title="Stały skład" />
                        )}
                      </span>
                      <span className="font-bold flex items-center gap-1.5">
                        {player.full_name || player.name}
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase text-[#2C4BFF] bg-[#2C4BFF]/10 px-1.5 py-0.5 rounded-md">
                            Ty
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Opłacone z depozytu (Nadpłaty Graczy) zamiast świeżą gotówką za ten
                          mecz — gotówka za to wpisowe wpłynęła do kasy już przy doładowaniu. */}
                      {isPaid && player.paid_from_credit && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border bg-[#7A5CFF]/10 text-[#4B2FB0] border-[#7A5CFF]/25"
                          title="Opłacone z wcześniej wpłaconego depozytu"
                        >
                          z depozytu
                        </span>
                      )}
                      {canTogglePaid ? (
                        <button
                          onClick={() => handleTogglePaid(player.id, isPaid)}
                          title="Kliknij, aby zmienić status płatności"
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer",
                            isPaid
                              ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25 hover:bg-[#00C48C]/20"
                              : "bg-[#FFD23F]/10 text-[#946E00] border-[#FFD23F]/30 hover:bg-[#FFD23F]/20"
                          )}
                        >
                          {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                          {isPaid ? `${price} PLN` : "Nieopłacone"}
                        </button>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border",
                          isPaid
                            ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25"
                            : "bg-[#FFD23F]/10 text-[#946E00] border-[#FFD23F]/30"
                        )}>
                          {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                          {isPaid ? `${price} PLN` : "Nieopłacone"}
                        </span>
                      )}

                      {(isAdmin || isCurrent) && !isSettled && !isCancelled && (
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="rounded-xl p-1.5 text-slate-400 hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] transition-colors active:scale-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F]"
                          title="Wypisz ze składu"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* LISTA REZERWOWA — kolejność DOSŁOWNIE odzwierciedla kto wejdzie następny, gdy
              zwolni się miejsce w składzie głównym (patrz komentarz przy `rawReserves` wyżej) */}
          {rawReserves.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-[#4B2FB0]">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Lista Rezerwowa ({rawReserves.length}):
                </span>
              </div>

              <div className="space-y-1.5">
                {rawReserves.map((player: any, idx: number) => {
                  const isCurrent = player.id === currentUser?.id || player.email === currentUser?.email

                  return (
                    <div
                      key={player.id || idx}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border p-2.5 text-xs",
                        isCurrent ? "bg-[#7A5CFF]/[0.06] border-[#7A5CFF]/25 text-[#4B2FB0] font-bold" : "bg-slate-50/50 border-slate-100 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn(score.className, "text-[10px] font-semibold text-[#7A5CFF] uppercase bg-[#7A5CFF]/10 px-2 py-0.5 rounded-lg tabular-nums")}>
                          R{idx + 1}
                        </span>
                        <span>{player.full_name || player.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase text-[#7A5CFF] bg-[#7A5CFF]/10 px-1.5 py-0.5 rounded-md">
                            Ty
                          </span>
                        )}
                      </div>

                      {(isAdmin || isCurrent) && !isSettled && !isCancelled && (
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="rounded-xl p-1 text-slate-400 hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F]"
                          title="Wypisz z rezerwy"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* DOLNE PRZYCISKI: DOŁĄCZ / WYPISZ SIĘ — samo zamknięcie robi już X w nagłówku
            (plus klik w tło / Escape), więc tu zostaje tylko realna akcja (dołącz/wypisz),
            gdy jest dostępna; poniżej też toast i ConfirmDialog na potwierdzenia */}
        {!isSettled && !isCancelled && (
        <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
          {(
            isUserInMatch ? (
              canLeaveMatch ? (
                <Button
                  variant="outline"
                  onClick={() => handleRemovePlayer(currentUser.id)}
                  className="rounded-xl border-[#FF5A5F]/30 text-[#FF5A5F] hover:bg-[#FF5A5F]/10 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <UserMinus className="h-4 w-4" />
                  Wypisz mnie
                </Button>
              ) : (
                <div
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-400"
                  title="Skontaktuj się z administratorem, jeśli musisz zrezygnować tak późno"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Wypisanie zablokowane (&lt;2h do meczu)
                </div>
              )
            ) : (
              <Button
                onClick={handleJoinMatch}
                disabled={isJoining}
                className={cn(
                  "rounded-xl text-white text-xs font-bold gap-1.5 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed",
                  rawRoster.length >= capacity
                    ? "bg-[#7A5CFF] hover:bg-[#6647E0] shadow-[#7A5CFF]/25"
                    : "bg-[#2C4BFF] hover:bg-[#1D3AE8] shadow-[#2C4BFF]/25"
                )}
              >
                <UserPlus className="h-4 w-4" />
                {isJoining ? "Zapisywanie..." : rawRoster.length >= capacity ? "Dołącz do listy rezerwowej" : "Dołącz do meczu"}
              </Button>
            )
          )}
        </div>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1120] px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-[#00E0A2]" />
            {toast}
          </div>
        )}

        <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />
      </div>
    </div>
  )
}
