export type PlayerStatus = "main" | "waitlist"

export type Player = {
  id: string
  name: string
  registeredAt: string
  paid: boolean
  fee: number
}

export type MatchStatus = "upcoming" | "past"

export type Match = {
  id: string
  date: string
  startTime: string
  endTime: string
  location: string
  capacity: number
  fee: number
  status: MatchStatus
  rating: number
  players: Player[]
}

const firstNames = [
  "Kuba",
  "Marta",
  "Piotr",
  "Ola",
  "Tomek",
  "Ania",
  "Michał",
  "Kasia",
  "Bartek",
  "Zosia",
  "Adam",
  "Ewa",
  "Filip",
  "Nina",
  "Wojtek",
  "Lena",
  "Damian",
  "Iga",
]

const lastNames = [
  "Nowak",
  "Kowalski",
  "Wiśniewska",
  "Wójcik",
  "Kamiński",
  "Lewandowska",
  "Zieliński",
  "Szymańska",
  "Woźniak",
  "Dąbrowski",
  "Kozłowska",
  "Mazur",
  "Krawczyk",
  "Piotrowska",
  "Grabowski",
  "Pawlak",
  "Michalska",
  "Król",
]

function makePlayers(count: number, fee: number, paidRatio: number): Player[] {
  return Array.from({ length: count }).map((_, i) => {
    const hour = 14 + Math.floor(i / 4)
    const minute = (i % 4) * 12
    return {
      id: `p-${i}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      registeredAt: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      paid: i / count < paidRatio,
      fee,
    }
  })
}

export const matches: Match[] = [
  {
    id: "m-1",
    date: "2026-07-28",
    startTime: "19:00",
    endTime: "21:00",
    location: "Main Arena",
    capacity: 12,
    fee: 20,
    status: "upcoming",
    rating: 0,
    players: makePlayers(15, 20, 0.6),
  },
  {
    id: "m-2",
    date: "2026-07-30",
    startTime: "18:00",
    endTime: "20:00",
    location: "West Sports Hall",
    capacity: 12,
    fee: 20,
    status: "upcoming",
    rating: 0,
    players: makePlayers(8, 20, 0.5),
  },
  {
    id: "m-3",
    date: "2026-08-02",
    startTime: "20:00",
    endTime: "22:00",
    location: "Riverside Gym",
    capacity: 12,
    fee: 25,
    status: "upcoming",
    rating: 0,
    players: makePlayers(14, 25, 0.35),
  },
  {
    id: "m-4",
    date: "2026-07-21",
    startTime: "19:00",
    endTime: "21:00",
    location: "Main Arena",
    capacity: 12,
    fee: 20,
    status: "past",
    rating: 5,
    players: makePlayers(12, 20, 1),
  },
  {
    id: "m-5",
    date: "2026-07-18",
    startTime: "18:30",
    endTime: "20:30",
    location: "West Sports Hall",
    capacity: 12,
    fee: 20,
    status: "past",
    rating: 4,
    players: makePlayers(12, 20, 0.92),
  },
  {
    id: "m-6",
    date: "2026-07-14",
    startTime: "20:00",
    endTime: "22:00",
    location: "Riverside Gym",
    capacity: 10,
    fee: 25,
    status: "past",
    rating: 3,
    players: makePlayers(10, 25, 1),
  },
]

export function mainRoster(match: Match): Player[] {
  return match.players.slice(0, match.capacity)
}

export function waitlist(match: Match): Player[] {
  return match.players.slice(match.capacity)
}

export function paidCount(match: Match): number {
  return mainRoster(match).filter((p) => p.paid).length
}

export function collected(match: Match): number {
  return mainRoster(match)
    .filter((p) => p.paid)
    .reduce((sum, p) => sum + p.fee, 0)
}

export function expected(match: Match): number {
  return mainRoster(match).reduce((sum, p) => sum + p.fee, 0)
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatWeekday(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", { weekday: "long" })
}
