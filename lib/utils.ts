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
