"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Plus,
  UserCheck,
  Receipt,
  Search,
  CheckCircle2,
  ArrowLeft,
  PiggyBank,
  Loader2
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { getTransactions, getPlayerBalances } from "@/lib/data"

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

export default function FinancesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [playerBalances, setPlayerBalances] = useState<PlayerOverpayment[]>([])

  // Formularz nowej operacji
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState<"income" | "expense">("income")
  const [newAmount, setNewAmount] = useState("")
  const [newCollectedBy, setNewCollectedBy] = useState("Mateusz Podzorski")
  const [newCategory, setNewCategory] = useState("mecz")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Wczytywanie profilu zalogowanego użytkownika z localStorage oraz danych finansowych
  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      const parsedUser = JSON.parse(localUser)
      setUser(parsedUser)
      setNewCollectedBy(parsedUser?.name || parsedUser?.full_name || "Mateusz Podzorski")
    } else {
      setUser(null)
    }

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

    loadData()
  }, [])

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Obsługa wylogowania
  async function handleLogout() {
    localStorage.removeItem("volley_user")
    localStorage.clear()
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  // Wyliczania bilansu
  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0)
  }, [transactions])

  const totalExpense = useMemo(() => {
    return transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0)
  }, [transactions])

  const currentCash = totalIncome - totalExpense

  const totalOverpayments = useMemo(() => {
    return playerBalances.reduce((acc, p) => acc + (Number(p.balance) > 0 ? Number(p.balance) : 0), 0)
  }, [playerBalances])

  // Zapis nowej operacji w Supabase z dokładnym raportowaniem błędów
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
      console.error("Błąd zapisu Supabase:", error.message, error.details, error.hint)
      notify(`Błąd zapisu: ${error.message || 'Sprawdź uprawnienia RLS'}`)
    } else if (data && data.length > 0) {
      setTransactions([data[0], ...transactions])
      setShowAddModal(false)
      setNewTitle("")
      setNewAmount("")
      notify("Pomyślnie dodano opłatę do kasy!")
    }

    setIsSubmitting(false)
  }

  const filteredTransactions = transactions.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.collected_by?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 lg:px-8">

          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Powrót do pulpitu
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <Wallet className="h-7 w-7 text-primary" />
                Rozliczenie Kasy Zespołu
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Śledź wpływy z meczy, wydatki na salę oraz nadpłaty zawodników.
              </p>
            </div>

            <Button onClick={() => setShowAddModal(true)} className="gap-2 rounded-xl shadow-md">
              <Plus className="h-4 w-4" />
              Dodaj wpłatę / wydatek
            </Button>
          </div>

          {/* Kafelki Podsumowania Finansowego (KPI) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-background to-background p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aktualny Stan Kasy</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-400">{currentCash.toFixed(2)} PLN</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Dostępny budżet bieżący</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <PiggyBank className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-background to-background p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suma Wpływów</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-blue-400">+{totalIncome.toFixed(2)} PLN</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Wszystkie zebrane opłaty</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <ArrowUpCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-background to-background p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suma Wydatków</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-rose-400">-{totalExpense.toFixed(2)} PLN</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Opłaty za halę i rachunki</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-background to-background p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nadpłaty Graczy</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-purple-400">{totalOverpayments.toFixed(2)} PLN</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Zaliczki na przyszłe mecze</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Księga Rozliczeń i Wpłat
                </h2>

                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Szukaj wpłaty, zbierającego…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background py-1.5 pl-9 pr-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Ładowanie księgi rozliczeń z bazy Supabase...
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-xs">
                    Brak opłat spełniających kryteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="p-3.5">Lp.</th>
                          <th className="p-3.5">Data</th>
                          <th className="p-3.5">Opis operacji / Tytuł</th>
                          <th className="p-3.5">Osoba zbierająca</th>
                          <th className="p-3.5 text-right">Kwota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-medium">
                        {filteredTransactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className="hover:bg-secondary/20 transition-colors">
                            <td className="p-3.5 text-muted-foreground font-bold">{filteredTransactions.length - idx}</td>
                            <td className="p-3.5 text-foreground whitespace-nowrap">{tx.date}</td>
                            <td className="p-3.5 text-foreground">
                              <p className="font-semibold">{tx.title}</p>
                              <span className="text-[10px] text-muted-foreground uppercase">{tx.category}</span>
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground border border-border/40">
                                <UserCheck className="h-3 w-3 text-primary" />
                                {tx.collected_by}
                              </span>
                            </td>
                            <td className={cn(
                              "p-3.5 text-right font-bold text-sm whitespace-nowrap",
                              tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {tx.type === "income" ? "+" : "-"}{Number(tx.amount).toFixed(2)} PLN
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card p-4 rounded-2xl border border-border">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-purple-400" />
                  Nadpłaty Zawodników
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo zaliczek graczy na poczet nadchodzących meczy</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                {playerBalances.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Brak wpisanych nadpłat.</p>
                ) : (
                  playerBalances.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/40">
                      <div>
                        <p className="text-xs font-bold text-foreground">{player.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {Number(player.balance) > 0 ? "Posiada depozyt" : "Brak nadpłaty"}
                        </p>
                      </div>

                      <span className={cn(
                        "text-xs font-extrabold px-2.5 py-1 rounded-lg border",
                        Number(player.balance) > 0
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-secondary text-muted-foreground border-border/40"
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Dodaj nową operację do Kasy</h2>

            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Typ operacji</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("income")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold border transition-colors",
                      newType === "income" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    + Wpływ (Przychód)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("expense")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold border transition-colors",
                      newType === "expense" ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    - Wydatek (Opłata)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tytuł / Opis operacji</label>
                <input
                  type="text"
                  required
                  placeholder="np. Wpłata od Marka / Zapłata za halę"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Kwota (PLN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Kto zbierał / płacił?</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Krzysiek, Marek"
                    value={newCollectedBy}
                    onChange={(e) => setNewCollectedBy(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="rounded-xl text-xs">
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl text-xs">
                  {isSubmitting ? "Zapisywanie..." : "Zapisz operację"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
