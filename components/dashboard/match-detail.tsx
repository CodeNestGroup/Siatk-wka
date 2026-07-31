"use client"

import { useState, useEffect, useRef } from "react"
import {
  X,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  Smartphone,
  Banknote,
  Loader2,
  ShieldAlert
} from "lucide-react"
import { type Match, mainRoster, waitlist, collected } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Message = {
  id: string
  user_name: string
  text: string
  created_at: string
  is_admin?: boolean
}

type MatchDetailProps = {
  match: Match
  onChange: (updated: Match) => void
  onClose: () => void
  currentUser?: any
}

export function MatchDetail({ match, onChange, onClose, currentUser }: MatchDetailProps) {
  const [activeTab, setActiveTab] = useState<"roster" | "chat" | "payments">("roster")
  const [messages, setMessages] = useState<Message[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const [currentMatch, setCurrentMatch] = useState<Match>(match)
  const [selectedPlayerForBlik, setSelectedPlayerForBlik] = useState<string | null>(null)
  const [blikCode, setBlikCode] = useState("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Wyznaczenie nazwy i roli zalogowanego użytkownika
  const currentUserName = currentUser?.full_name || (currentUser?.email === "admin@admin.pl" ? "Mateusz Podzorski" : currentUser?.email) || "Mateusz Podzorski"
  const currentUserEmail = currentUser?.email || ""
  const isAdmin = currentUser?.email === "admin@admin.pl" || currentUser?.role === "admin"

  // Pobieranie czatu z Supabase
  useEffect(() => {
    async function fetchChatMessages() {
      setIsChatLoading(true)
      const { data, error } = await supabase
        .from('match_messages')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
      setIsChatLoading(false)
    }

    fetchChatMessages()
  }, [match.id])

  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, activeTab])

  // Wysyłanie wiadomości na czat
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msgPayload = {
      match_id: match.id,
      user_name: currentUserName,
      text: newMessage.trim(),
      is_admin: isAdmin
    }

    const { data, error } = await supabase
      .from('match_messages')
      .insert([msgPayload])
      .select()

    if (!error && data) {
      setMessages((prev) => [...prev, data[0]])
      setNewMessage("")
    }
  }

  // Zmiana metody płatności na Gotówkę
  function handleSelectCash(playerName: string) {
    updatePlayerStatus(playerName, false, "cash")
  }

  // Potwierdzenie odbioru gotówki przez Admina
  function handleConfirmCash(playerName: string) {
    if (!isAdmin) return
    updatePlayerStatus(playerName, true, "paid")
  }

  // Symulacja udanej płatności BLIK
  function handleExecuteBlikPayment() {
    if (blikCode.length < 6 || !selectedPlayerForBlik) return

    setIsProcessingPayment(true)
    setTimeout(() => {
      updatePlayerStatus(selectedPlayerForBlik, true, "blik")
      setIsProcessingPayment(false)
      setSelectedPlayerForBlik(null)
      setBlikCode("")
    }, 1200)
  }

  // Aktualizacja statusu gracza
  function updatePlayerStatus(playerName: string, paid: boolean, payMethod: string) {
    const updatedPlayers = currentMatch.players.map((p) => {
      const pName = p.name || p.email
      if (pName === playerName || p.email === playerName) {
        return { ...p, paid, pay_method: payMethod }
      }
      return p
    })

    const updatedMatch = { ...currentMatch, players: updatedPlayers }
    setCurrentMatch(updatedMatch)
    onChange(updatedMatch)
  }

  const roster = mainRoster(currentMatch)
  const waiting = waitlist(currentMatch)
  const totalCollected = collected(currentMatch)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Nagłówek */}
        <div className="relative bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent p-6 border-b border-border">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold shadow-md">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Mecz {currentMatch.date}</h2>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  {currentMatch.status === "upcoming" ? "Nadchodzący" : "Zakończony"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {currentMatch.location} • Skład: <strong className="text-foreground">{roster.length}/{currentMatch.capacity}</strong>
              </p>
            </div>
          </div>

          {/* Nawigacja */}
          <div className="flex items-center gap-2 mt-6 border-t border-border/40 pt-4">
            <button
              onClick={() => setActiveTab("roster")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "roster"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              Skład ({roster.length}/{currentMatch.capacity})
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all relative",
                activeTab === "chat"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Czat meczowy
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "payments"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Wallet className="h-4 w-4" />
              Wpłaty ({totalCollected} PLN)
            </button>
          </div>
        </div>

        {/* Zawartość Zakładek */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* SKŁAD */}
          {activeTab === "roster" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                  <span>Główny skład</span>
                  <span className="text-xs text-muted-foreground font-normal">Miejsca: {roster.length}/{currentMatch.capacity}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roster.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/40">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{p.name || p.email}</span>
                      </div>
                      {p.paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Opłacone
                        </span>
                      ) : p.pay_method === "cash" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          <Clock className="h-3 w-3" /> Gotówka
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {waiting.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-amber-500 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Lista rezerwowa ({waiting.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {waiting.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <span className="text-sm font-medium text-foreground">{p.name || p.email}</span>
                        <span className="text-xs text-amber-500 font-semibold">Poz. +{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CZAT */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-[380px]">
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                {isChatLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Ładowanie czatu...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    Brak wiadomości. Napisz coś do zawodników!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.user_name === currentUserName
                    const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[80%] space-y-1",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[11px] font-bold text-slate-300">{msg.user_name}</span>
                          {msg.is_admin && (
                            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                              <ShieldAlert className="h-2.5 w-2.5" />
                              Admin
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{timeFormatted}</span>
                        </div>

                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-xs font-medium shadow-sm leading-relaxed",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-secondary text-foreground rounded-bl-none border border-border/60"
                          )}
                        >
                          {msg.text}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Napisz wiadomość do grupy..."
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button type="submit" size="sm" className="rounded-xl px-4 gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Wyślij
                </Button>
              </form>
            </div>
          )}

          {/* WPŁATY (Z RESTRYKCJĄ PŁATNOŚCI) */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-semibold uppercase">Zebrany budżet</p>
                  <p className="text-xl font-bold text-emerald-500">{totalCollected} PLN</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Koszt dla osoby</p>
                  <p className="text-sm font-bold text-foreground">{currentMatch.price_per_player} PLN</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {roster.map((p, i) => {
                  const playerName = p.name || p.email
                  const isPaid = p.paid
                  const isCash = p.pay_method === "cash" && !p.paid

                  // Kluczowa weryfikacja: Czy ten wiersz odpowiada ZALOGOWANEMU UŻYTKOWNIKOWI?
                  const isCurrentUserRow = playerName === currentUserName || p.email === currentUserEmail

                  return (
                    <div key={i} className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border gap-3 transition-colors",
                      isCurrentUserRow ? "bg-primary/5 border-primary/30" : "bg-card border-border"
                    )}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground">{playerName}</p>
                          {isCurrentUserRow && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary border border-primary/30">
                              Ty
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isPaid && "Zaksięgowano online"}
                          {isCash && "Zadeklarowano gotówkę na hali"}
                          {!isPaid && !isCash && "Oczekuje na wpłatę"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1. OPŁACONE */}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            Opłacone
                          </span>
                        )}

                        {/* 2. GOTÓWKA DO ODBIORU */}
                        {isCash && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1.5 text-xs font-bold">
                              <Clock className="h-4 w-4" />
                              Gotówka (Do opłacenia)
                            </span>
                            {/* Tylko ADMIN może odebrać gotówkę */}
                            {isAdmin && (
                              <button
                                onClick={() => handleConfirmCash(playerName)}
                                className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              >
                                Odebrano 💵
                              </button>
                            )}
                          </div>
                        )}

                        {/* 3. BRAK WPŁATY -> PŁATNOŚĆ DOSTĘPNA TYLKO DLA TEGO GRACZA */}
                        {!isPaid && !isCash && (
                          isCurrentUserRow ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedPlayerForBlik(playerName)}
                                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
                              >
                                <Smartphone className="h-3.5 w-3.5" />
                                Opłać (BLIK)
                              </button>

                              <button
                                onClick={() => handleSelectCash(playerName)}
                                className="flex items-center gap-1 rounded-xl bg-secondary border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                Gotówka
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic font-medium px-2 py-1">
                              Nieopłacone
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL BLIK */}
      {selectedPlayerForBlik && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500 font-extrabold text-lg border border-rose-500/30">
              BLIK
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Szybka płatność BLIK</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Wpisz 6-cyfrowy kod BLIK z aplikacji banku, aby opłacić <strong className="text-foreground">{currentMatch.price_per_player} PLN</strong> za swój udział w meczu.
              </p>
            </div>

            <input
              type="text"
              maxLength={6}
              placeholder="000 000"
              value={blikCode}
              onChange={(e) => setBlikCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-2xl border border-input bg-background py-3 text-center text-2xl font-extrabold tracking-widest text-foreground outline-none focus:ring-2 focus:ring-rose-500/40"
            />

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedPlayerForBlik(null)} className="w-full rounded-xl text-xs">
                Anuluj
              </Button>
              <Button
                onClick={handleExecuteBlikPayment}
                disabled={blikCode.length < 6 || isProcessingPayment}
                className="w-full rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isProcessingPayment ? "Weryfikacja..." : "Zapłać teraz"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
