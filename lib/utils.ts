import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format daty w polskim porządku dzień.miesiąc.rok — zamiast surowego ISO (rrrr-mm-dd) z bazy
export function formatDatePL(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  if (!y || !m || !d) return dateStr
  return `${d}.${m}.${y}`
}

// ────────────────────────────────────────────────────────────────
// Wyszukiwarka tolerancyjna na literówki (fuzzy search)
// ────────────────────────────────────────────────────────────────

const PL_DIACRITICS: Record<string, string> = {
  "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n",
  "ó": "o", "ś": "s", "ź": "z", "ż": "z"
}

// Usuwa polskie znaki diakrytyczne (ą→a, ę→e, ż→z...), żeby "zolty" trafiał na "żółty"
export function normalizeSearchText(value: string): string {
  return (value || "")
    .toString()
    .toLowerCase()
    .split("")
    .map((ch) => PL_DIACRITICS[ch] ?? ch)
    .join("")
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const row = new Array(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j

  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1])
      prev = temp
    }
  }
  return row[n]
}

// Dopuszczalna liczba literówek rośnie wraz z długością słowa — krótkie słowa (1-3 znaki)
// muszą pasować dokładnie, żeby uniknąć zbyt szerokich, przypadkowych trafień
function fuzzyTolerance(len: number): number {
  if (len <= 3) return 0
  if (len <= 5) return 1
  if (len <= 8) return 2
  return 3
}

function fuzzyWordMatch(haystackTokens: string[], queryWord: string): boolean {
  if (!queryWord) return true
  if (haystackTokens.some((t) => t.includes(queryWord))) return true

  const tolerance = fuzzyTolerance(queryWord.length)
  if (tolerance === 0) return false
  return haystackTokens.some((t) => levenshteinDistance(t, queryWord) <= tolerance)
}

// Dopasowuje zapytanie (jedno lub kilka słów) do listy znormalizowanych tokenów.
// Każde słowo zapytania musi znaleźć dopasowanie — dokładne lub tolerancyjne na literówki.
export function fuzzySearchMatch(haystackTokens: string[], query: string): boolean {
  const queryWords = normalizeSearchText(query).split(/[^a-z0-9]+/).filter(Boolean)
  if (queryWords.length === 0) return true
  return queryWords.every((qw) => fuzzyWordMatch(haystackTokens, qw))
}

// ────────────────────────────────────────────────────────────────
// "Dodaj do kalendarza" — Google Calendar (link) i .ics (Apple/Outlook)
// ────────────────────────────────────────────────────────────────

export type MatchCalendarInfo = {
  id: string
  title?: string | null
  date: string
  timeStart?: string | null
  timeEnd?: string | null
  location?: string | null
  price?: number
}

// Daty meczów w bazie są "naiwne" (bez strefy czasowej) i zawsze odnoszą się do czasu
// polskiego — parsując je jako lokalny czas przeglądarki dostajemy poprawny wynik dla
// każdego użytkownika appki (wszyscy grają/oglądają z Polski), bez biblioteki do stref czasowych.
function matchDateRange(date: string, timeStart?: string | null, timeEnd?: string | null) {
  const start = new Date(`${date}T${(timeStart || "19:00:00").slice(0, 8)}`)
  const end = new Date(`${date}T${(timeEnd || "21:00:00").slice(0, 8)}`)
  return { start, end }
}

function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

function matchCalendarTitle(m: MatchCalendarInfo): string {
  return m.title && m.title !== m.date ? m.title : `Mecz siatkówki (${formatDatePL(m.date)})`
}

export function buildGoogleCalendarUrl(m: MatchCalendarInfo): string {
  const { start, end } = matchDateRange(m.date, m.timeStart, m.timeEnd)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: matchCalendarTitle(m),
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    location: m.location || "",
    details: m.price ? `Składka: ${m.price} PLN / os.` : ""
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadMatchIcs(m: MatchCalendarInfo) {
  const { start, end } = matchDateRange(m.date, m.timeStart, m.timeEnd)

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ESCO VolleyManager//PL",
    "BEGIN:VEVENT",
    `UID:match-${m.id}@volleymanager`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${matchCalendarTitle(m).replace(/\r?\n/g, " ")}`,
    `LOCATION:${(m.location || "").replace(/\r?\n/g, " ")}`,
    `DESCRIPTION:${m.price ? `Składka: ${m.price} PLN / os.` : ""}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n")

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `mecz-${m.date}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

// iPadOS zgłasza się jako "Macintosh" w UA, ale w odróżnieniu od prawdziwego Maca ma ekran
// dotykowy — stąd dodatkowy warunek na maxTouchPoints, standardowa sztuczka na wykrycie iPada.
function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
  const isMac = /Macintosh/.test(ua) && !isIOS
  return isIOS || isMac
}

// Przycisk sam decyduje: iPhone/iPad/Mac -> pobiera .ics (jedno kliknięcie otwiera go w
// natywnym Kalendarzu Apple), wszystko inne (głównie Android, na który celuje appka) ->
// od razu otwiera Google Calendar z gotowym wydarzeniem. Bez wyboru — jeden klik, jedna akcja.
export function addMatchToCalendar(m: MatchCalendarInfo) {
  if (isApplePlatform()) {
    downloadMatchIcs(m)
  } else {
    window.open(buildGoogleCalendarUrl(m), "_blank", "noopener,noreferrer")
  }
}
