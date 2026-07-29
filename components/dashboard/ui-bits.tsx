import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

type Tone = "success" | "warning" | "danger" | "info" | "neutral"

const toneClasses: Record<Tone, string> = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-primary/12 text-primary",
  neutral: "bg-muted text-muted-foreground",
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StarRating({
  value,
  size = 14,
}: {
  value: number
  size?: number
}) {
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">Not rated</span>
  }
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={cn(
            i < value
              ? "fill-warning text-warning"
              : "fill-transparent text-border",
          )}
        />
      ))}
    </span>
  )
}

export function ProgressBar({
  value,
  max,
  tone = "success",
}: {
  value: number
  max: number
  tone?: "success" | "warning" | "danger"
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  const barColor =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-destructive"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", barColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
