"use client"

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Plus,
  UserCheck,
  Search,
  CheckCircle2,
  PiggyBank,
  Trash2,
  Download,
  X,
  Coffee,
  Heart,
  ChevronDown
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { cn, formatDatePL, normalizeSearchText, fuzzySearchMatch } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { getTransactions, getPlayerBalances } from "@/lib/data"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"
const CORAL = "#FF5A5F"
const MINT = "#00C48C"
const VIOLET = "#7A5CFF"

// Kategorie operacji — wcześniej pole istniało w bazie i na karcie transakcji, ale formularz
// nigdy nie dawał wyboru (zawsze zapisywał "mecz"), więc KAŻDA operacja — nawet zakup piłek
// czy opłata za halę — pokazywała się jako "MECZ". Teraz da się faktycznie wybrać.
const CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: "mecz", label: "Mecz", color: COBALT },
  { id: "sprzet", label: "Sprzęt", color: VIOLET },
  { id: "hala", label: "Hala", color: YELLOW },
  { id: "inne", label: "Inne", color: "#94A3B8" },
]

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

// Kolejne barwy marki dla wstęgi sponsorów — zamiast przypadkowych kolorów Tailwind per sponsor
// Jedyny realny sponsor na dziś to ESCO — reszta to świadomie oznaczone wolne miejsca,
// pokazujące mechanizm wyświetlania przyszłych sponsorów (nie wymyślone nazwy firm, żeby
// nikt nie pomyślał że to już podpisani partnerzy).
// `logo` to opcjonalna ścieżka do pliku w /public — jeśli podana, appka pokaże obrazek
// zamiast kolorowego kwadratu z kodem. Wrzuć plik do public/logos/ i wpisz tu ścieżkę.
const sponsors: { code: string; name: string; desc: string; color: string; logo?: string }[] = [
  { code: "ESCO", name: "ESCO Jaworze", desc: "Sponsor Tytularny", color: CORAL, logo: "/logos/esco.png" },
  { code: "+", name: "Zostań Sponsorem", desc: "Wolne miejsce", color: COBALT },
  { code: "+", name: "Zostań Sponsorem", desc: "Wolne miejsce", color: MINT },
  { code: "+", name: "Zostań Sponsorem", desc: "Wolne miejsce", color: YELLOW },
]

// Płynne podliczanie liczb — ten sam komponent co na pozostałych stronach
function CountUp({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const from = prevValue.current
    const to = value
    if (from === to) return

    const duration = 700
    const start = performance.now()
    let raf: number

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(from + (to - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else prevValue.current = to
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{displayValue.toFixed(decimals)}</>
}

type Transaction = {
  id: string
  date: string
  title: string
  type: "income" | "expense"
  amount: number
  collected_by: string
  category: string
}

type PlayerOverpayment = {
  id: string
  name: string
  balance: number
}

function buildTxSearchTokens(t: Transaction): string[] {
  return normalizeSearchText(`${t.title || ""} ${t.collected_by || ""} ${t.category || ""}`).split(/[^a-z0-9]+/).filter(Boolean)
}

export default function FinancesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all")
  const [showAllTx, setShowAllTx] = useState(false)
  useEffect(() => {
    setShowAllTx(false)
  }, [typeFilter, searchTerm])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [playerBalances, setPlayerBalances] = useState<PlayerOverpayment[]>([])

  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState<"income" | "expense">("income")
  const [newAmount, setNewAmount] = useState("")
  const [newCollectedBy, setNewCollectedBy] = useState("Mateusz Podzorski")
  const [newCategory, setNewCategory] = useState("mecz")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Suwak pod aktywną zakładką filtra — ten sam mechanizm co na pozostałych stronach
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, top: 0, height: 0 })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin ||
    user?.role_id === 1 ||
    user?.email === "admin@admin.pl" ||
    user?.name === "Mateusz Podzorski" ||
    user?.full_name === "Mateusz Podzorski"

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      const parsedUser = JSON.parse(localUser)
      setUser(parsedUser)
      setNewCollectedBy(parsedUser?.name || parsedUser?.full_name || "Mateusz Podzorski")
    } else {
      setUser(null)
    }

    loadData()
  }, [])

  useLayoutEffect(() => {
    const el = tabRefs.current[typeFilter]
    if (el) {
      setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, top: el.offsetTop, height: el.offsetHeight })
    }
  }, [typeFilter, isLoading, user])

  async function loadData() {
    setIsLoading(true)
    const [txData, balancesData] = await Promise.all([
      getTransactions(),
      getPlayerBalances()
    ])

    setTransactions(txData)
    setPlayerBalances(balancesData)
    setIsLoading(false)
  }

  function notify(msg: string) {
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

  function exportFinancesToCSV(itemsToExport: Transaction[], filename: string) {
    if (itemsToExport.length === 0) return

    const esc = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`

    const headers = "Lp.,Data,Tytul,Kategoria,Osoba Zbierajaca,Kwota (PLN)\n"
    const rows = itemsToExport.map((t, i) => {
      const amountStr = t.type === "income" ? `+${t.amount}` : `-${t.amount}`
      return [itemsToExport.length - i, esc(t.date), esc(t.title), esc(t.category), esc(t.collected_by), esc(amountStr)].join(",")
    }).join("\n")

    const blob = new Blob(["﻿" + headers + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.click()
    URL.revokeObjectURL(url)
    notify("Pobrano plik CSV!")
  }

  function handleDeleteTransaction(id: string, title: string) {
    setConfirmDialog({
      title: "Usunąć wpis z kasy?",
      message: `Operacja "${title}" zniknie z księgi rozliczeń bezpowrotnie.`,
      confirmLabel: "Usuń trwale",
      danger: true,
      onConfirm: () => performDeleteTransaction(id)
    })
  }

  async function performDeleteTransaction(id: string) {
    setConfirmDialog(null)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      notify(`Błąd usuwania: ${error.message}`)
      loadData()
    } else {
      notify("Transakcja została usunięta")
    }
  }

  const incomeItems = useMemo(() => transactions.filter(t => t.type === "income"), [transactions])
  const expenseItems = useMemo(() => transactions.filter(t => t.type === "expense"), [transactions])

  const totalIncome = useMemo(() => incomeItems.reduce((acc, t) => acc + Number(t.amount), 0), [incomeItems])
  const totalExpense = useMemo(() => expenseItems.reduce((acc, t) => acc + Number(t.amount), 0), [expenseItems])

  const currentCash = totalIncome - totalExpense

  const totalOverpayments = useMemo(() => {
    return playerBalances.reduce((acc, p) => acc + (Number(p.balance) > 0 ? Number(p.balance) : 0), 0)
  }, [playerBalances])

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle || !newAmount) return

    setIsSubmitting(true)
    const amountNum = parseFloat(newAmount)
    const newTx = {
      date: new Date().toISOString().split("T")[0],
      title: newTitle,
      type: newType,
      amount: amountNum,
      collected_by: newCollectedBy,
      category: newCategory,
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select()

    if (error) {
      notify(`Błąd zapisu: ${error.message}`)
    } else if (data && data.length > 0) {
      setTransactions([data[0], ...transactions])
      setShowAddModal(false)
      setNewTitle("")
      setNewAmount("")
      setNewCategory("mecz")
      notify("Pomyślnie dodano operację do kasy!")
    }

    setIsSubmitting(false)
  }

  const searchMatchedTx = transactions.filter((t) => fuzzySearchMatch(buildTxSearchTokens(t), searchTerm))

  const filterCounts = {
    all: searchMatchedTx.length,
    income: searchMatchedTx.filter((t) => t.type === "income").length,
    expense: searchMatchedTx.filter((t) => t.type === "expense").length
  }

  const filteredTransactions = searchMatchedTx.filter((t) => {
    if (typeFilter === "income") return t.type === "income"
    if (typeFilter === "expense") return t.type === "expense"
    return true
  })

  // Skrócony widok kart na mobile — rejestr transakcji tylko rośnie przez sezon, więc bez
  // limitu byłby to najdłuższy scroll w całej appce. Pełna lista zawsze przy wyszukiwaniu.
  const TX_PREVIEW_LIMIT = 5
  const isTxListTruncated = !searchTerm && filteredTransactions.length > TX_PREVIEW_LIMIT
  const visibleTransactions = isTxListTruncated && !showAllTx ? filteredTransactions.slice(0, TX_PREVIEW_LIMIT) : filteredTransactions

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] text-[#14181F]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(640px circle at 10% -8%, rgba(44,75,255,0.07), transparent 60%), radial-gradient(520px circle at 92% 16%, rgba(255,210,63,0.10), transparent 55%), radial-gradient(760px circle at 45% 100%, rgba(0,196,140,0.05), transparent 60%)"
          }}
        />

        {/* Header z wstęgą sponsorów */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 pl-16 pr-6 py-3.5 lg:px-6 backdrop-blur-md">
          <style jsx>{`
            @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
            .animate-marquee { display: flex; width: max-content; animation: marquee 30s linear infinite; }
            .animate-marquee:hover { animation-play-state: paused; }
          `}</style>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee gap-8 flex items-center">
              {[...sponsors, ...sponsors].map((s, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0">
                  {s.logo ? (
                    <img src={s.logo} alt={s.name} className="h-6 w-6 rounded-lg object-contain" />
                  ) : (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg font-black text-[9px] text-white"
                      style={{ background: s.color }}
                    >
                      {s.code}
                    </span>
                  )}
                  <span className="text-xs font-extrabold text-slate-500">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-6">
            <button
              onClick={() => setShowSupportModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>
            <NotificationsBell
              onNotificationClick={(notif: NotificationItem) => {}}
            />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8">

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#00875F] border border-slate-200 shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Rozliczenie Kasy Zespołu</h1>
                <p className="text-xs font-medium text-slate-500">Śledź wpływy z meczy, wydatki na salę oraz nadpłaty zawodników.</p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="h-10 rounded-2xl font-bold text-xs flex items-center gap-2 px-4 text-white cursor-pointer active:scale-[0.97] shadow-md transition-all"
                style={{ background: COBALT, boxShadow: `0 4px 14px -4px ${COBALT}80` }}
              >
                <Plus className="h-4 w-4" />
                Dodaj wpłatę / wydatek
              </button>
            )}
          </div>

          {/* HERO — aktualny stan kasy, w stylu głównego dashboardu */}
          <div
            className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
            style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#00C48C]/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#FFD23F]/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00C48C]/20 border border-[#00C48C]/40 text-[#00E0A2] shrink-0">
                  <PiggyBank className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Aktualny Stan Kasy</p>
                  <h2 className={cn(score.className, "text-4xl font-semibold mt-0.5 tabular-nums", currentCash < 0 ? "text-[#FF9296]" : "text-white")}>
                    <CountUp value={currentCash} /> <span className="text-lg text-slate-400 font-medium">PLN</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Dostępny budżet zespołu</p>
                </div>
              </div>

              <button
                onClick={() => exportFinancesToCSV(filteredTransactions, "Raport_Finansowy_ESCO.csv")}
                disabled={filteredTransactions.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs px-4 py-2.5 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Download className="h-4 w-4" />
                Pobierz raport CSV
              </button>
            </div>
          </div>

          {/* Kafelki Podsumowania */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setTypeFilter(typeFilter === "income" ? "all" : "income")}
              className={cn(
                "rounded-[24px] border p-4 sm:p-5 shadow-xs flex items-center justify-between text-left transition-all cursor-pointer active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md",
                typeFilter === "income" ? "border-[#2C4BFF] ring-2 ring-[#2C4BFF]/20 bg-[#2C4BFF]/[0.04]" : "border-slate-200/90 bg-white"
              )}
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2C4BFF]">Suma Wpływów</p>
                <h3 className={cn(score.className, "mt-1 text-xl font-semibold text-slate-900 tabular-nums")}>+<CountUp value={totalIncome} /> PLN</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Wszystkie przychody</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C4BFF]/10 text-[#2C4BFF] border border-[#2C4BFF]/20 shrink-0">
                <ArrowUpCircle className="h-6 w-6" />
              </div>
            </button>

            <button
              onClick={() => setTypeFilter(typeFilter === "expense" ? "all" : "expense")}
              className={cn(
                "rounded-[24px] border p-4 sm:p-5 shadow-xs flex items-center justify-between text-left transition-all cursor-pointer active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md",
                typeFilter === "expense" ? "border-[#FF5A5F] ring-2 ring-[#FF5A5F]/20 bg-[#FF5A5F]/[0.04]" : "border-slate-200/90 bg-white"
              )}
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF5A5F]">Suma Wydatków</p>
                <h3 className={cn(score.className, "mt-1 text-xl font-semibold text-slate-900 tabular-nums")}>-<CountUp value={totalExpense} /> PLN</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Wszystkie koszty</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A5F]/10 text-[#FF5A5F] border border-[#FF5A5F]/20 shrink-0">
                <ArrowDownCircle className="h-6 w-6" />
              </div>
            </button>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A5CFF]">Nadpłaty Graczy</p>
                <h3 className={cn(score.className, "mt-1 text-xl font-semibold text-slate-900 tabular-nums")}><CountUp value={totalOverpayments} /> PLN</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Zaliczki zawodników</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A5CFF]/10 text-[#7A5CFF] border border-[#7A5CFF]/20 shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">

            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Szukaj wpłaty, zbierającego…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs font-medium outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 shadow-xs transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shrink-0">
                  <div
                    className="absolute rounded-xl bg-[#0B1120] shadow-md transition-all duration-300 ease-out"
                    style={{ left: pillStyle.left, width: pillStyle.width, top: pillStyle.top, height: pillStyle.height }}
                  />
                  {[
                    { id: "all", label: `Wszystkie (${filterCounts.all})` },
                    { id: "income", label: `Wpływy (${filterCounts.income})` },
                    { id: "expense", label: `Wydatki (${filterCounts.expense})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      ref={(el) => { tabRefs.current[tab.id] = el }}
                      onClick={() => setTypeFilter(tab.id as any)}
                      className={cn(
                        "relative z-10 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors duration-300 cursor-pointer active:scale-[0.97] whitespace-nowrap",
                        typeFilter === tab.id ? "text-white" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="h-3.5 w-16 rounded-md bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-40 rounded-md bg-slate-100" />
                          <div className="h-3 w-24 rounded-md bg-slate-100" />
                        </div>
                        <div className="h-4 w-20 rounded-md bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-12 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {searchTerm ? `Brak wyników dla „${searchTerm}”.` : "Brak opłat spełniających kryteria."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tabela — od md w górę */}
                    <div className="hidden md:block overflow-x-auto animate-in fade-in duration-300">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                          <tr>
                            <th className="p-4">Lp.</th>
                            <th className="p-4">Data</th>
                            <th className="p-4">Opis operacji / Tytuł</th>
                            <th className="p-4">Osoba zbierająca</th>
                            <th className="p-4 text-right">Kwota</th>
                            {isAdmin && <th className="p-4 text-right">Akcje</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredTransactions.map((tx, idx) => (
                            <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4 text-slate-400 font-extrabold">{filteredTransactions.length - idx}</td>
                              <td className="p-4 text-slate-900 font-bold whitespace-nowrap">{formatDatePL(tx.date)}</td>
                              <td className="p-4 text-slate-900">
                                <p className="font-bold">{tx.title}</p>
                                <span className="text-[10px] text-slate-400 uppercase font-extrabold">{tx.category}</span>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200/60">
                                  <UserCheck className="h-3 w-3 text-[#2C4BFF]" />
                                  {tx.collected_by}
                                </span>
                              </td>
                              <td className={cn(
                                "p-4 text-right font-black text-sm whitespace-nowrap",
                                tx.type === "income" ? "text-[#00875F]" : "text-[#E0454A]"
                              )}>
                                {tx.type === "income" ? "+" : "-"}{Number(tx.amount).toFixed(2)} PLN
                              </td>
                              {isAdmin && (
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleDeleteTransaction(tx.id, tx.title)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] transition-colors cursor-pointer active:scale-90"
                                    title="Usuń wpis"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Karty — poniżej md, żeby uniknąć poziomego scrolla tabeli */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {visibleTransactions.map((tx, idx) => (
                        <div key={tx.id || idx} className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate">{tx.title}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-extrabold mt-0.5">{tx.category} • {formatDatePL(tx.date)}</p>
                            </div>
                            <span className={cn(
                              "font-black text-sm whitespace-nowrap shrink-0",
                              tx.type === "income" ? "text-[#00875F]" : "text-[#E0454A]"
                            )}>
                              {tx.type === "income" ? "+" : "-"}{Number(tx.amount).toFixed(2)} PLN
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200/60">
                              <UserCheck className="h-3 w-3 text-[#2C4BFF]" />
                              {tx.collected_by}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteTransaction(tx.id, tx.title)}
                                className="p-1.5 rounded-xl text-slate-400 hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] transition-colors cursor-pointer active:scale-90"
                                title="Usuń wpis"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {isTxListTruncated && !showAllTx && (
                        <button
                          onClick={() => setShowAllTx(true)}
                          className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-bold text-slate-500 transition-all hover:text-[#1D3AE8] cursor-pointer active:scale-[0.99]"
                        >
                          Pokaż wszystkie ({filteredTransactions.length})
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-[24px] border border-slate-200/80 shadow-xs">
                <h2 className={cn(display.className, "text-sm font-bold text-slate-900 flex items-center gap-2")}>
                  <PiggyBank className="h-4 w-4 text-[#7A5CFF]" />
                  Nadpłaty Zawodników
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Saldo zaliczek graczy na mecze</p>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 space-y-2.5 shadow-xs">
                {playerBalances.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7A5CFF]/10 text-[#7A5CFF]">
                      <PiggyBank className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400">Brak wpisanych nadpłat.</p>
                  </div>
                ) : (
                  playerBalances.map((player, idx) => (
                    <div
                      key={player.id}
                      style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100 animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{player.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {Number(player.balance) > 0 ? "Posiada depozyt" : "Brak nadpłaty"}
                        </p>
                      </div>

                      <span className={cn(
                        "text-xs font-black px-2.5 py-1 rounded-xl border",
                        Number(player.balance) > 0
                          ? "bg-[#7A5CFF]/10 text-[#4B2FB0] border-[#7A5CFF]/25"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      )}>
                        +{Number(player.balance).toFixed(2)} PLN
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </main>
      </div>

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* MODAL: Dodaj operację */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm"
        cardClassName="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className={cn(display.className, "text-base font-bold text-slate-900")}>Dodaj nową operację do Kasy</h2>
          <button onClick={() => setShowAddModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAddTransaction} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Typ operacji</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewType("income")}
                className={cn(
                  "py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer active:scale-95",
                  newType === "income" ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/40" : "bg-slate-100 text-slate-500 border-slate-200"
                )}
              >
                + Wpływ (Przychód)
              </button>
              <button
                type="button"
                onClick={() => setNewType("expense")}
                className={cn(
                  "py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer active:scale-95",
                  newType === "expense" ? "bg-[#FF5A5F]/10 text-[#E0454A] border-[#FF5A5F]/40" : "bg-slate-100 text-slate-500 border-slate-200"
                )}
              >
                - Wydatek (Opłata)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kategoria</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewCategory(cat.id)}
                  style={newCategory === cat.id ? { background: `${cat.color}1A`, borderColor: `${cat.color}66`, color: cat.color } : undefined}
                  className={cn(
                    "py-2 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer active:scale-95",
                    newCategory !== cat.id && "bg-slate-100 text-slate-500 border-slate-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tytuł / Opis operacji</label>
            <input
              type="text"
              required
              placeholder="np. Wpłata od Marka / Zapłata za halę"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium outline-none focus:border-[#2C4BFF] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Kwota (PLN)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-black outline-none focus:border-[#2C4BFF] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Kto zbierał / płacił?</label>
              <input
                type="text"
                required
                placeholder="np. Krzysiek, Marek"
                value={newCollectedBy}
                onChange={(e) => setNewCollectedBy(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium outline-none focus:border-[#2C4BFF] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="rounded-xl text-xs font-bold cursor-pointer">
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl text-xs bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white font-bold cursor-pointer shadow-md shadow-[#2C4BFF]/20">
              {isSubmitting ? "Zapisywanie..." : "Zapisz operację"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1120]/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-[#00E0A2]" />
          {toast}
        </div>
      )}
    </div>
  )
}
