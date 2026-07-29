"use client"

import { useState } from "react"
import { X, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Match } from "@/lib/data"

export function CreateMatch({
  onCreate,
  onClose,
}: {
  onCreate: (m: Match) => void
  onClose: () => void
}) {
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("19:00")
  const [endTime, setEndTime] = useState("21:00")
  const [location, setLocation] = useState("Main Arena")
  const [capacity, setCapacity] = useState(12)
  const [fee, setFee] = useState(20)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    onCreate({
      id: `m-${Date.now()}`,
      date,
      startTime,
      endTime,
      location,
      capacity,
      fee,
      status: "upcoming",
      rating: 0,
      players: [],
    })
  }

  const fieldClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
  const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Create new match"
        className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Create New Match
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="start" className={labelClass}>
                Start time
              </label>
              <input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="end" className={labelClass}>
                End time
              </label>
              <input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className={labelClass}>
              Location / Hall
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="capacity" className={labelClass}>
                Capacity
              </label>
              <input
                id="capacity"
                type="number"
                min={2}
                max={24}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="fee" className={labelClass}>
                Fee (PLN)
              </label>
              <input
                id="fee"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create match</Button>
        </div>
      </form>
    </div>
  )
}
