"use client"

import { MapPin, Bell, Trash2, Eye, Clock } from "lucide-react"
import { Badge, StarRating, ProgressBar } from "./ui-bits"
import {
  type Match,
  mainRoster,
  waitlist,
  paidCount,
  collected,
  expected,
  formatDate,
} from "@/lib/data"

function CapacityBadge({ match }: { match: Match }) {
  const enrolled = mainRoster(match).length
  const full = enrolled >= match.capacity
  const nearFull = enrolled >= match.capacity - 2
  return (
    <Badge tone={full ? "danger" : nearFull ? "warning" : "success"}>
      {enrolled}/{match.capacity}
      {full ? " · Full" : ""}
    </Badge>
  )
}

function FinancialCell({ match }: { match: Match }) {
  const paid = paidCount(match)
  const total = mainRoster(match).length
  const tone = paid === total ? "success" : paid >= total / 2 ? "warning" : "danger"
  return (
    <div className="w-40">
      <div className="mb-1 flex items-center justify-between text-xs font-medium">
        <span className="text-foreground">
          {paid}/{total} Paid
        </span>
        <span className="text-muted-foreground">
          {collected(match)}/{expected(match)} PLN
        </span>
      </div>
      <ProgressBar value={paid} max={total} tone={tone} />
    </div>
  )
}

function ActionButtons({
  match,
  onSelect,
  onNotify,
  onDelete,
}: {
  match: Match
  onSelect: (m: Match) => void
  onNotify: (m: Match) => void
  onDelete: (m: Match) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onSelect(match)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="View roster"
      >
        <Eye className="h-[18px] w-[18px]" />
      </button>
      <button
        onClick={() => onNotify(match)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        aria-label="Send push notification"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>
      <button
        onClick={() => onDelete(match)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete match"
      >
        <Trash2 className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}

export function MatchList({
  matches,
  onSelect,
  onNotify,
  onDelete,
}: {
  matches: Match[]
  onSelect: (m: Match) => void
  onNotify: (m: Match) => void
  onDelete: (m: Match) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-4 font-medium">Date &amp; Time</th>
              <th className="px-5 py-4 font-medium">Location</th>
              <th className="px-5 py-4 font-medium">Enrolled</th>
              <th className="px-5 py-4 font-medium">Waitlist</th>
              <th className="px-5 py-4 font-medium">Financials</th>
              <th className="px-5 py-4 font-medium">Rating</th>
              <th className="px-5 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.map((match) => {
              const wl = waitlist(match).length
              return (
                <tr
                  key={match.id}
                  className="group transition-colors hover:bg-secondary/60"
                >
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onSelect(match)}
                      className="text-left font-semibold text-foreground hover:text-primary"
                    >
                      {formatDate(match.date)}
                    </button>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {match.startTime} – {match.endTime}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {match.location}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <CapacityBadge match={match} />
                  </td>
                  <td className="px-5 py-4">
                    {wl > 0 ? (
                      <Badge tone="warning">+{wl} on waitlist</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <FinancialCell match={match} />
                  </td>
                  <td className="px-5 py-4">
                    <StarRating value={match.rating} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <ActionButtons
                        match={match}
                        onSelect={onSelect}
                        onNotify={onNotify}
                        onDelete={onDelete}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border lg:hidden">
        {matches.map((match) => {
          const wl = waitlist(match).length
          return (
            <div key={match.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    onClick={() => onSelect(match)}
                    className="text-left font-semibold text-foreground"
                  >
                    {formatDate(match.date)}
                  </button>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {match.startTime} – {match.endTime}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {match.location}
                  </p>
                </div>
                <StarRating value={match.rating} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CapacityBadge match={match} />
                {wl > 0 && <Badge tone="warning">+{wl} waitlist</Badge>}
              </div>

              <div className="mt-3">
                <FinancialCell match={match} />
              </div>

              <div className="mt-3 flex items-center justify-end">
                <ActionButtons
                  match={match}
                  onSelect={onSelect}
                  onNotify={onNotify}
                  onDelete={onDelete}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
