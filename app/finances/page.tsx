
"use client"

import { useState, useEffect, useMemo } from "react"
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
  Loader2,
  Trash2,
  Download,
  X
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { getTransactions, getPlayerBalances } from "@/lib/data"

const sponsors = [
  { code: "BSC", name: "Beskid Sport Center", desc: "Partner Sprzętowy", color: "bg-emerald-100 text-emerald-700" },
  { code: "SKO", name: "Skoczów Park", desc: "Oficjalny Partner", color: "bg-amber-100 text-amber-700" },
  { code: "VOLLEY", name: "VolleyStore", desc: "Sklep Siatkarski", color: "bg-purple-100 text-purple-700" },
  { code: "AZ", name: "AZ-Cloud Solutions", desc: "Infrastruktura IT", color: "bg-blue-100 text-blue-700" },
  { code: "ESCO", name: "ESCO Jaworze", desc: "Sponsor Tytularny", color: "bg-indigo-100 text-indigo-700" },
]

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

  // Stan dla modali szczegółowych wpływów/wydatków
  const [activeModal, setActiveModal] = useState<"income" | "expense" | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [playerBalances, setPlayerBalances] = useState<PlayerOverpayment[]>([])

  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState<"income" | "expense">("income")
  const [newAmount, setNewAmount] = useState("")
  const [newCollectedBy, setNewCollectedBy] = useState("Mateusz Podzorski")
  const [newCategory, setNewCategory] = useState("mecz")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    localStorage.clear()
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  function exportFinancesToCSV(itemsToExport = transactions, filename = "Raport_Finansowy_ESCO.csv") {
    if (itemsToExport.length === 0) return alert("Brak danych do wyeksportowania!")

    const headers = "Lp.,Data,Tytul,Kategoria,Osoba Zbierajaca,Kwota (PLN)\n"
    const rows = itemsToExport.map((t, i) => {
      const amountStr = t.type === "income" ? `+${t.amount}` : `-${t.amount}`
      return `${itemsToExport.length - i},"${t.date}","${t.title}","${t.category}","${t.collected_by}","${amountStr}"`
    }).join("\n")

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notify("Pobrano plik CSV!")
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć ten wpis z bazy finansowej?")) return

    setTransactions((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      console.error("Błąd usuwania transakcji:", error.message)
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
      console.error("Błąd zapisu Supabase:", error.message)
      notify(`Błąd zapisu: ${error.message}`)
    } else if (data && data.length > 0) {
      setTransactions([data[0], ...transactions])
      setShowAddModal(false)
      setNewTitle("")
      setNewAmount("")
      notify("Pomyślnie dodano operację do kasy!")
    }

    setIsSubmitting(false)
  }

  const filteredTransactions = transactions.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.collected_by?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Ustandaryzowany nagłówek ze sponsorami i dzwoneczkiem */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-3.5 backdrop-blur-md">
          <style jsx>{`
            @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
            .animate-marquee { display: flex; width: max-content; animation: marquee 30s linear infinite; }
            .animate-marquee:hover { animation-play-state: paused; }
          `}</style>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee gap-8 flex items-center">
              {[...sponsors, ...sponsors].map((s, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg font-black text-[9px]", s.color)}>{s.code}</span>
                  <span className="text-xs font-extrabold text-slate-500">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-6">
            <NotificationsBell
              onNotificationClick={(notif: NotificationItem) => {
                // obsługa powiadomień
              }}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8">

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Rozliczenie Kasy Zespołu</h1>
                <p className="text-xs font-medium text-slate-500">Śledź wpływy z meczy, wydatki na salę oraz nadpłaty zawodników.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => exportFinancesToCSV(transactions, "Raport_Finansowy_Pelny.csv")} variant="outline" className="gap-2 rounded-2xl text-xs font-bold border-slate-200 bg-white cursor-pointer">
                <Download className="h-4 w-4 text-blue-600" />
                Pobierz raport CSV
              </Button>

              {isAdmin && (
                <Button onClick={() => setShowAddModal(true)} className="gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  Dodaj wpłatę / wydatek
                </Button>
              )}
            </div>
          </div>

          {/* Kafelki Podsumowania */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Aktualny Stan Kasy</p>
                <h3 className={cn("mt-1 text-xl font-black", currentCash < 0 ? "text-rose-600" : "text-slate-900")}>
                  {currentCash.toFixed(2)} PLN
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Dostępny budżet</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200/50">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>

            <button
              onClick={() => setActiveModal("income")}
              className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white p-5 shadow-sm flex items-center justify-between text-left hover:border-blue-400 transition-all cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Suma Wpływów</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">+{totalIncome.toFixed(2)} PLN</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Wszystkie przychody</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200/50 shrink-0">
                <ArrowUpCircle className="h-6 w-6" />
              </div>
            </button>

            <button
              onClick={() => setActiveModal("expense")}
              className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50/60 to-white p-5 shadow-sm flex items-center justify-between text-left hover:border-rose-400 transition-all cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">Suma Wydatków</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">-{totalExpense.toFixed(2)} PLN</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Wszystkie koszty</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 border border-rose-200/50 shrink-0">
                <ArrowDownCircle className="h-6 w-6" />
              </div>
            </button>

            <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Nadpłaty Graczy</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{totalOverpayments.toFixed(2)} PLN</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Zaliczki zawodników</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 border border-purple-200/50">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 space-y-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Szukaj wpłaty, zbierającego…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs font-medium outline-none focus:border-blue-500 shadow-sm transition-all"
                />
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Ładowanie księgi rozliczeń z bazy...
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-medium">
                    Brak opłat spełniających kryteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                            <td className="p-4 text-slate-900 font-bold whitespace-nowrap">{tx.date}</td>
                            <td className="p-4 text-slate-900">
                              <p className="font-bold">{tx.title}</p>
                              <span className="text-[10px] text-slate-400 uppercase font-extrabold">{tx.category}</span>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200/60">
                                <UserCheck className="h-3 w-3 text-blue-600" />
                                {tx.collected_by}
                              </span>
                            </td>
                            <td className={cn(
                              "p-4 text-right font-black text-sm whitespace-nowrap",
                              tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {tx.type === "income" ? "+" : "-"}{Number(tx.amount).toFixed(2)} PLN
                            </td>
                            {isAdmin && (
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
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
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-purple-600" />
                  Nadpłaty Zawodników
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Saldo zaliczek graczy na mecze</p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-4 space-y-2.5 shadow-sm">
                {playerBalances.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-medium">Brak wpisanych nadpłat.</p>
                ) : (
                  playerBalances.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{player.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {Number(player.balance) > 0 ? "Posiada depozyt" : "Brak nadpłaty"}
                        </p>
                      </div>

                      <span className={cn(
                        "text-xs font-black px-2.5 py-1 rounded-xl border",
                        Number(player.balance) > 0
                          ? "bg-purple-100 text-purple-700 border-purple-200"
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

      {/* MODAL: Szczegóły Wpływów lub Wydatków */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black flex items-center gap-2">
                {activeModal === "income" ? (
                  <>
                    <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                    Wykaz Wpływów do Kasy
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="h-5 w-5 text-rose-600" />
                    Wykaz Wydatków Zespołu
                  </>
                )}
              </h2>
              <button onClick={() => setActiveModal(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {(activeModal === "income" ? incomeItems : expenseItems).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400 font-medium">Brak pozycji w tej kategorii.</p>
              ) : (
                (activeModal === "income" ? incomeItems : expenseItems).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.date} • {item.collected_by}</p>
                    </div>
                    <span className={cn("font-black text-sm", activeModal === "income" ? "text-emerald-600" : "text-rose-600")}>
                      {activeModal === "income" ? "+" : "-"}{Number(item.amount).toFixed(2)} PLN
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                onClick={() => exportFinancesToCSV(
                  activeModal === "income" ? incomeItems : expenseItems,
                  `Raport_${activeModal === "income" ? "Wplywy" : "Wydatki"}_ESCO.csv`
                )}
                variant="outline"
                className="gap-2 rounded-xl text-xs font-bold border-slate-200 cursor-pointer"
              >
                <Download className="h-4 w-4 text-blue-600" /> Pobierz raport CSV
              </Button>
              <Button onClick={() => setActiveModal(null)} className="rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer">
                Zamknij
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900">
            <h2 className="text-base font-black">Dodaj nową operację do Kasy</h2>

            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Typ operacji</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("income")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer",
                      newType === "income" ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}
                  >
                    + Wpływ (Przychód)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("expense")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer",
                      newType === "expense" ? "bg-rose-100 text-rose-700 border-rose-300" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}
                  >
                    - Wydatek (Opłata)
                  </button>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-black outline-none focus:border-blue-500 focus:bg-white"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="rounded-xl text-xs font-bold cursor-pointer">
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                  {isSubmitting ? "Zapisywanie..." : "Zapisz operację"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
