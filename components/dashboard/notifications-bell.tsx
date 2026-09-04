"use client"

import { useState, useEffect } from "react"
import { Bell, Calendar, Wallet, Megaphone, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { fetchReadKeys, markKeysRead } from "@/lib/notifications"
import { formatDatePL } from "@/lib/utils"

export type NotificationItem = {
  id: string
  dbId: string
  title: string
  description: string
  date: string
  type: "match" | "finance" | "announcement"
  read: boolean
  created_at?: string
}

// "Przeczytane" żyje teraz w bazie (tabela notification_reads), nie w localStorage —
// patrz lib/notifications.ts po wyjaśnienie dlaczego to wcześniej dawało błędne liczniki
// (np. "+40 znowu przy kolejnym logowaniu"), niezsynchronizowane między telefonem a komputerem.
export function NotificationsBell({
  playerId,
  onNotificationClick
}: {
  playerId?: string
  onNotificationClick?: (notif: NotificationItem) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (!playerId) return
    fetchRecentNotifications()

    const handleRefresh = () => fetchRecentNotifications()
    window.addEventListener("update-badges", handleRefresh)
    return () => window.removeEventListener("update-badges", handleRefresh)
  }, [playerId])

  async function fetchRecentNotifications() {
    if (!playerId) return
    const readKeys = await fetchReadKeys(playerId)

    const [{ data: matches }, { data: txs }, { data: announcements }] = await Promise.all([
      supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20)
    ])

    const list: NotificationItem[] = []

    matches?.forEach((m) => {
      const key = `match-${m.id}`
      if (!readKeys.has(key)) {
        list.push({
          id: key,
          dbId: String(m.id),
          title: "Nowy / Zmieniony mecz",
          description: `Mecz (${formatDatePL(m.date)}) - ${m.location || 'Hala Jaworze'}`,
          date: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Dzisiaj",
          type: "match",
          read: false,
          created_at: m.created_at
        })
      }
    })

    txs?.forEach((t) => {
      const key = `tx-${t.id}`
      if (!readKeys.has(key)) {
        list.push({
          id: key,
          dbId: String(t.id),
          title: t.type === "income" ? "Nowa wpłata" : "Nowy wydatek",
          description: `${t.title} (${t.amount} PLN)`,
          date: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Dzisiaj",
          type: "finance",
          read: false,
          created_at: t.created_at
        })
      }
    })

    announcements?.forEach((a) => {
      const key = `announcement-${a.id}`
      if (!readKeys.has(key)) {
        list.push({
          id: key,
          dbId: String(a.id),
          title: "Nowe ogłoszenie",
          description: a.title,
          date: a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Dzisiaj",
          type: "announcement",
          read: false,
          created_at: a.created_at
        })
      }
    })

    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })

    setNotifications(list)
  }

  async function markAsRead(item: NotificationItem) {
    if (!playerId) return
    setNotifications((prev) => prev.filter((n) => n.id !== item.id))
    await markKeysRead(playerId, [item.id])
    window.dispatchEvent(new Event("update-badges")) // Gasi kropkę w menu natychmiast
  }

  async function markAllAsRead() {
    if (!playerId) return
    const keys = notifications.map((n) => n.id)
    setNotifications([])
    await markKeysRead(playerId, keys)
    window.dispatchEvent(new Event("update-badges"))
  }

  const unreadCount = notifications.length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
        title="Powiadomienia"
      >
        <Bell className="h-4 w-4" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl z-50 space-y-3 text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Powiadomienia</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                  {unreadCount} nowe
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-blue-600 hover:underline px-1.5 py-0.5 cursor-pointer"
                >
                  Odczytaj wszystkie
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {unreadCount === 0 ? (
              <p className="py-6 text-center text-xs font-medium text-slate-400">Brak nowych powiadomień.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    markAsRead(item)
                    if (onNotificationClick) onNotificationClick(item)
                  }}
                  className="flex items-start gap-3 p-2.5 rounded-2xl border text-xs bg-blue-50/60 border-blue-200 text-slate-900 font-bold shadow-sm transition-all cursor-pointer hover:bg-blue-100/80"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                    item.type === "match" ? "bg-blue-100 text-blue-600" : item.type === "announcement" ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {item.type === "match" ? <Calendar className="h-4 w-4" /> : item.type === "announcement" ? <Megaphone className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-extrabold text-[11px] text-slate-900 truncate">{item.title}</p>
                      <span className="text-[9px] font-medium text-slate-400 shrink-0">{item.date}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{item.description}</p>
                  </div>

                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
