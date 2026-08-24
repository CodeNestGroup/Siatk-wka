"use client"

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
  Copy,
  Check,
  Clock,
  MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"
import { type Match, mainRoster, waitlist } from "@/lib/data"
import { cn, formatDatePL } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

// Te same tokeny co w dashboardzie / sidebarze ("Under the Lights").
// Docelowo warto wynieść display/score do wspólnego /lib/fonts.ts.
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

type MatchDetailProps = {
  match: Match & { is_settled?: boolean }
  onChange: (updated: Match) => void
  onClose: () => void
  currentUser: any
}

export function MatchDetail({ match, onChange, onClose, currentUser }: MatchDetailProps) {
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

  const sortedReserves = [...rawReserves].sort((a: any, b: any) => {
    const isUserA = a.id === currentUser?.id || a.email === currentUser?.email
    const isUserB = b.id === currentUser?.id || b.email === currentUser?.email
    if (isUserA) return -1
    if (isUserB) return 1
    return 0
  })

  // Rozróżnienie "ile faktycznie wpłacone" (na podstawie realnych flag is_paid) od
  // "ile powinno wpłynąć w sumie" — settle księguje to drugie, karta podsumowania pokazuje pierwsze
  const paidRosterCount = rawRoster.filter((p: any) => p.paid || p.is_paid).length
  const totalCollectedSoFar = paidRosterCount * price
  const totalExpected = rawRoster.length * price
  const isSettled = !!match.is_settled

  const [toast, setToast] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  const isUserInMatch = match.players?.some(
    (p: any) => p.id === currentUser?.id || p.email === currentUser?.email
  )

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

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

  function handleCopyRoster() {
    navigator.clipboard.writeText(buildRosterMessage())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(buildRosterMessage())}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  async function handleSettleAndSave() {
    if (isSettled || rawRoster.length === 0) return
    setIsSaving(true)

    const updatedPlayers = (match.players || []).map((p: any) => ({
      ...p,
      paid: true,
      is_paid: true
    }))

    const updatedMatch: Match & { is_settled?: boolean } = {
      ...match,
      players: updatedPlayers,
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

    await supabase
      .from("match_registrations")
      .update({ is_paid: true })
      .eq("match_id", match.id)

    const collectorName = currentUser?.full_name || currentUser?.name || "Organizator"
    const matchTitle = match.title || `Zbiórka na hali (${formatDatePL(match.date)})`

    const newTx = {
      date: new Date().toISOString().split("T")[0],
      title: `Zbiórka z meczu: ${matchTitle}`,
      type: "income",
      amount: totalExpected,
      collected_by: collectorName,
      category: "mecz",
    }

    const { error: txErr } = await supabase.from("transactions").insert([newTx])

    if (txErr) {
      notify("Mecz zablokowany, ale wpis do księgi zgłosił błąd.")
    } else {
      notify(`Pomyślnie rozliczono! +${totalExpected} PLN w Finansach.`)
    }

    onChange(updatedMatch)
    setIsSaving(false)
  }

  async function handleTogglePaid(playerId: string, currentlyPaid: boolean) {
    if (isSettled || !isAdmin) return

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
    if (isSettled) return
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
    const { error } = await supabase
      .from("match_registrations")
      .delete()
      .eq("match_id", match.id)
      .eq("player_id", playerId)

    if (!error) {
      const updatedPlayers = (match.players || []).filter((p: any) => p.id !== playerId)
      onChange({ ...match, players: updatedPlayers })
      notify("Wypisano zawodnika ze składu.")
    }
  }

  async function handleJoinMatch() {
    // Blokada podwójnego zapisu — bez tego szybki podwójny klik/tap (zanim interfejs zdąży
    // się przerenderować z `isUserInMatch`) potrafił wstawić dwa wiersze rejestracji dla tej
    // samej osoby, bo tabela nie ma unikalnego ograniczenia na parę (mecz, zawodnik).
    if (!currentUser || isSettled || isJoining || isUserInMatch) return
    setIsJoining(true)

    const { error } = await supabase.from("match_registrations").insert([
      {
        match_id: match.id,
        player_id: currentUser.id,
        is_paid: true
      }
    ])

    if (!error) {
      const newPlayerObj = {
        id: currentUser.id,
        name: currentUser.full_name || currentUser.name || "Zawodnik",
        full_name: currentUser.full_name || currentUser.name || "Zawodnik",
        email: currentUser.email || "",
        paid: true,
        is_paid: true
      }
      onChange({ ...match, players: [...(match.players || []), newPlayerObj] })
      notify("Dołączyłeś do listy na ten mecz!")
    }
    setIsJoining(false)
  }

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl relative my-8 text-slate-900">

      {/* NAGŁÓWEK — ciemny pasek w stylu hero, spina modal z resztą identyfikacji "pod światłami hali" */}
      <div
        className="relative overflow-hidden p-6 sm:p-7 pb-7 text-white"
        style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD23F]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-black uppercase border",
              isSettled
                ? "bg-white/10 text-slate-300 border-white/20"
                : match.status_id === 4
                ? "bg-[#FF5A5F]/15 text-[#FF9296] border-[#FF5A5F]/30"
                : "bg-[#2C4BFF]/20 border-[#2C4BFF]/40 text-[#8FA1FF]"
            )}>
              {isSettled ? "Mecz Rozliczony" : match.status_id === 4 ? "Odwołany" : "Skład Meczowy"}
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
        </div>
      </div>

      {/* TREŚĆ */}
      <div className="p-6 sm:p-7 space-y-5">

        {/* Pasek zapełnienia składu — ten sam język wizualny co w hero na dashboardzie */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
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
        </div>

        {/* Podsumowanie */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#00C48C]/25 bg-[#00C48C]/[0.06] p-3.5 text-center">
            <p className="text-[10px] font-extrabold uppercase text-[#00875F]">Opłacono</p>
            <p className={cn(score.className, "text-xl font-semibold text-[#00875F] mt-0.5 tabular-nums")}>
              {paidRosterCount} <span className="text-xs text-slate-400 font-bold">/ {rawRoster.length}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-center">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Zebrana kasa</p>
            <p className={cn(score.className, "text-xl font-semibold text-slate-900 mt-0.5 tabular-nums")}>
              {totalCollectedSoFar} <span className="text-xs text-slate-400 font-bold">PLN</span>
            </p>
            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{paidRosterCount} × {price} PLN</p>
          </div>
        </div>

        {/* Przycisk rozliczenia dla Admina */}
        {isAdmin && !isSettled && match.status_id !== 4 && (
          <Button
            onClick={handleSettleAndSave}
            disabled={isSaving || rawRoster.length === 0}
            className="w-full rounded-2xl py-3 font-bold gap-2 bg-[#00C48C] hover:bg-[#00A876] text-white shadow-md shadow-[#00C48C]/25 cursor-pointer text-xs"
          >
            <Receipt className="h-4 w-4" />
            {isSaving ? "Księgowanie w finansach..." : `Zatwierdź i rozlicz w Finansach (+${totalExpected} PLN)`}
          </Button>
        )}

        {isSettled && (
          <div className="w-full rounded-2xl py-3 font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-500 border border-slate-200 text-xs">
            <Lock className="h-4 w-4 text-[#00875F]" />
            Mecz został już rozliczony i zaksięgowany w finansach
          </div>
        )}

        {/* Lista Zawodników */}
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {/* SKŁAD GŁÓWNY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Powołani Zawodnicy ({rawRoster.length}/{capacity}):</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyRoster}
                  className="text-[11px] font-bold text-[#2C4BFF] hover:text-[#1D3AE8] flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#00875F]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Skopiowano!" : "Kopiuj"}
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="text-[11px] font-bold text-[#00875F] hover:text-[#00693F] flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>

            {rawRoster.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Brak zapisanych graczy w składzie.
              </div>
            ) : (
              sortedRoster.map((player: any, idx: number) => {
                const isCurrent = player.id === currentUser?.id || player.email === currentUser?.email
                const isPaid = !!(player.paid || player.is_paid)
                const canTogglePaid = isAdmin && !isSettled

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

                      {(isAdmin || isCurrent) && !isSettled && (
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

          {/* LISTA REZERWOWA */}
          {sortedReserves.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-[#4B2FB0]">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Lista Rezerwowa ({sortedReserves.length}):
                </span>
              </div>

              <div className="space-y-1.5">
                {sortedReserves.map((player: any, idx: number) => {
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

                      {(isAdmin || isCurrent) && !isSettled && (
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

        {/* Dolne przyciski */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          {!isSettled && (
            isUserInMatch ? (
              <Button
                variant="outline"
                onClick={() => handleRemovePlayer(currentUser.id)}
                className="rounded-xl border-[#FF5A5F]/30 text-[#FF5A5F] hover:bg-[#FF5A5F]/10 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <UserMinus className="h-4 w-4" />
                Wypisz mnie
              </Button>
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

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs font-bold cursor-pointer ml-auto"
          >
            Zamknij
          </Button>
        </div>

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
