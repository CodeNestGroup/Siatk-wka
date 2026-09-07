"use client"

/**
 * GlobalSearch — jedno pole szukające po meczach, zawodnikach i ogłoszeniach naraz
 *
 * Co to jest: przycisk w nagłówku (lupka, obok dzwoneczka) otwierający modal z polem
 * tekstowym — wpisywanie od razu filtruje trzy listy naraz (fuzzy search, tolerancja na
 * literówki i polskie znaki, ten sam mechanizm co wyszukiwarka na Zawodnikach/Ogłoszeniach).
 * Kliknięcie w wynik przenosi do właściwej strony i "otwiera" dany element.
 * Renderuje: przycisk-lupka (Ctrl/Cmd+K też otwiera) -> modal z inputem i trzema grupami
 * wyników (Mecze/Zawodnicy/Ogłoszenia), każdy wpis z ikoną koloru sekcji i podtytułem.
 * Używany przez: nagłówek każdej podstrony (app/page.tsx, players, finances, announcements,
 * stats, settings) — jeden komponent, wstawiony tuż przed <NotificationsBell> wszędzie.
 * Dane z Supabase: pobiera do 100 ostatnich meczów, wszystkich graczy i do 100 ostatnich
 * ogłoszeń przy pierwszym otwarciu modala (nie przy każdym renderze strony), potem trzyma
 * w pamięci na czas życia komponentu.
 * Uwagi: appka nie ma routingu per-element (mecz/ogłoszenie to modal/stan klienta, nie
 * osobny URL) — klik w wynik więc albo wysyła zdarzenie `window` (gdy już jesteś na
 * właściwej stronie, żeby zadziałało natychmiast bez przeładowania), albo nawiguje z
 * parametrem w URL (`?match=`, `?q=`), który docelowa strona odczytuje raz przy montowaniu
 * (patrz efekty w app/page.tsx, app/players/page.tsx, app/announcements/page.tsx).
 */

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Search, Calendar, Users, Megaphone, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Modal } from "@/components/ui/modal"
import { isMatchCancelled } from "@/lib/data"
import { cn, normalizeSearchText, fuzzySearchMatch, formatDatePL } from "@/lib/utils"

const COBALT = "#2C4BFF"
const VIOLET = "#7A5CFF"
const CORAL = "#FF5A5F"

type ResultRow = { id: string; title: string; subtitle: string; badge?: string }

// Niektóre mecze mają w bazie `title` ustawiony na tę samą wartość co `date` (stary domyślny
// zapis, nie prawdziwy tytuł) — ten sam warunek co matchCalendarTitle w lib/utils.ts.
function matchLabel(m: any): string {
  return m.title && m.title !== m.date ? m.title : `Mecz ${formatDatePL(m.date)}`
}

function buildMatchTokens(m: any): string[] {
  return normalizeSearchText(`${matchLabel(m)} ${m.location || ""} ${formatDatePL(m.date)}`).split(/[^a-z0-9]+/).filter(Boolean)
}

function buildPlayerTokens(p: any): string[] {
  return normalizeSearchText(`${p.full_name || ""} ${p.email || ""}`).split(/[^a-z0-9]+/).filter(Boolean)
}

function buildAnnouncementTokens(a: any): string[] {
  return normalizeSearchText(`${a.title || ""} ${a.content || ""}`).split(/[^a-z0-9]+/).filter(Boolean)
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Dane pobierane dopiero przy pierwszym otwarciu — appka ma je już gdzie indziej w
  // pamięci na poszczególnych stronach, ale ten komponent żyje niezależnie na każdej z nich.
  useEffect(() => {
    if (!open || loaded) return
    ;(async () => {
      const [{ data: m }, { data: p }, { data: a }] = await Promise.all([
        supabase.from("matches").select("id, date, time_start, location, title, status_id, matches_status(name)").order("date", { ascending: false }).limit(100),
        supabase.from("players").select("id, full_name, email, player_status_id, role_id").order("full_name"),
        supabase.from("announcements").select("id, title, content, created_at").order("created_at", { ascending: false }).limit(100)
      ])
      setMatches(m || [])
      setPlayers(p || [])
      setAnnouncements(a || [])
      setLoaded(true)
    })()
  }, [open, loaded])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
    setQuery("")
  }, [open])

  // Skrót klawiszowy Ctrl/Cmd+K — standard znany z appek desktopowych, otwiera wyszukiwarkę
  // z dowolnego miejsca w appce bez sięgania po mysz.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const hasQuery = query.trim().length > 0
  const matchResults: ResultRow[] = hasQuery
    ? matches
        .filter((m) => fuzzySearchMatch(buildMatchTokens(m), query))
        .slice(0, 5)
        .map((m) => ({
          id: m.id,
          title: matchLabel(m),
          subtitle: `${formatDatePL(m.date)}${m.time_start ? ` • ${String(m.time_start).slice(0, 5)}` : ""}${m.location ? ` • ${m.location}` : ""}`,
          badge: isMatchCancelled(m) ? "Odwołany" : undefined
        }))
    : []
  // Zgłoszenia oczekujące (player_status_id/role_id === 3) żyją na Zawodnikach w osobnym
  // kafelku zatwierdzania, poza listą/wyszukiwarką tamtej strony — pomijamy je tu, bo klik
  // w wynik i tak wpisałby imię w wyszukiwarkę, która takich rekordów nigdy nie pokazuje.
  const playerResults: ResultRow[] = hasQuery
    ? players
        .filter((p) => p.player_status_id !== 3 && p.role_id !== 3)
        .filter((p) => fuzzySearchMatch(buildPlayerTokens(p), query))
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          title: p.full_name || p.email || "Zawodnik",
          subtitle: p.email || ""
        }))
    : []
  const announcementResults: ResultRow[] = hasQuery
    ? announcements
        .filter((a) => fuzzySearchMatch(buildAnnouncementTokens(a), query))
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          title: a.title || "Ogłoszenie",
          subtitle: (a.content || "").replace(/\s+/g, " ").trim().slice(0, 80)
        }))
    : []
  const totalResults = matchResults.length + playerResults.length + announcementResults.length

  function close() {
    setOpen(false)
  }

  // Appka nie ma osobnego URL-a per mecz/ogłoszenie (to stan klienta) — gdy jesteśmy już
  // na właściwej stronie, zdarzenie `window` działa od razu; w przeciwnym razie nawigacja
  // z parametrem w URL, który docelowa strona odczyta raz przy montowaniu.
  function goToMatch(id: string) {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("global-search-match", { detail: { id } }))
    } else {
      router.push(`/?match=${id}`)
    }
    close()
  }

  function goToPlayer(name: string) {
    if (pathname === "/players") {
      window.dispatchEvent(new CustomEvent("global-search-player", { detail: { q: name } }))
    } else {
      router.push(`/players?q=${encodeURIComponent(name)}`)
    }
    close()
  }

  function goToAnnouncement(title: string) {
    if (pathname === "/announcements") {
      window.dispatchEvent(new CustomEvent("global-search-announcement", { detail: { q: title } }))
    } else {
      router.push(`/announcements?q=${encodeURIComponent(title)}`)
    }
    close()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
        title="Szukaj (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
      </button>

      <Modal
        open={open}
        onClose={close}
        overlayClassName="z-[70] bg-[#0B1120]/70 backdrop-blur-sm"
        cardClassName="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj meczu, zawodnika, ogłoszenia..."
            className="flex-1 min-w-0 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!hasQuery ? (
            <p className="py-8 text-center text-xs font-medium text-slate-400">
              Zacznij pisać, żeby przeszukać mecze, zawodników i ogłoszenia naraz.
            </p>
          ) : totalResults === 0 ? (
            <p className="py-8 text-center text-xs font-medium text-slate-400">
              Brak wyników dla &quot;{query}&quot;.
            </p>
          ) : (
            <>
              <ResultGroup label="Mecze" icon={Calendar} color={COBALT} items={matchResults} onSelect={(r) => goToMatch(r.id)} />
              <ResultGroup label="Zawodnicy" icon={Users} color={VIOLET} items={playerResults} onSelect={(r) => goToPlayer(r.title)} />
              <ResultGroup label="Ogłoszenia" icon={Megaphone} color={CORAL} items={announcementResults} onSelect={(r) => goToAnnouncement(r.title)} />
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

function ResultGroup({
  label,
  icon: Icon,
  color,
  items,
  onSelect
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  items: ResultRow[]
  onSelect: (r: ResultRow) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className="px-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex w-full items-start gap-3 rounded-2xl p-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5" style={{ background: `${color}1A`, color }}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
              {item.badge && (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{item.badge}</span>
              )}
            </div>
            {item.subtitle && <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{item.subtitle}</p>}
          </div>
        </button>
      ))}
    </div>
  )
}
