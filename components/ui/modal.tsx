"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type ModalProps = {
  open: boolean
  children: React.ReactNode
  overlayClassName?: string
  cardClassName?: string
  onClose?: () => void
}

// Owija istniejące modale animacją WYJŚCIA — bez tego znikały błyskawicznie mimo
// ładnego wjazdu (fade+zoom). Komponent sam obserwuje `open`: gdy trafi na `false`,
// jeszcze przez chwilę renderuje siebie z klasami animate-out, dopiero potem znika z DOM.
// Rodzic nie musi nic zmieniać w logice zamykania — wystarczy owinąć istniejący JSX.
//
// Część wywołań zamyka modal CZYSZCZĄC jednocześnie dane, które treść modala czyta
// (np. `setSelectedMatchRosterPreview(null)` zamyka i zeruje dane w jednym ruchu) — bez
// zabezpieczenia dzieci renderowałyby się na `null` w trakcie animacji wyjścia. Dlatego
// zapamiętujemy ostatnie dzieci sprzed zamknięcia i to je renderujemy, dopóki trwa animacja.
export function Modal({ open, children, overlayClassName, cardClassName, onClose }: ModalProps) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)
  const lastChildren = useRef(children)

  if (open) lastChildren.current = children

  useEffect(() => {
    if (open) {
      setRendered(true)
      setClosing(false)
      return
    }
    if (!rendered) return
    setClosing(true)
    const timeout = setTimeout(() => {
      setRendered(false)
      setClosing(false)
    }, 160)
    return () => clearTimeout(timeout)
  }, [open, rendered])

  // Zamknięcie klawiszem Escape — wcześniej jedynym sposobem na zamknięcie modala było
  // trafienie w konkretny przycisk X/Anuluj, co jest sprzeczne z odruchem większości ludzi.
  useEffect(() => {
    if (!open || !onClose) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!rendered) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        closing ? "animate-out fade-out duration-150 fill-mode-both" : "animate-in fade-in duration-200 fill-mode-both",
        overlayClassName
      )}
    >
      <div className={cn(closing ? "animate-out fade-out zoom-out-95 duration-150 fill-mode-both" : "animate-in fade-in zoom-in-95 duration-200 fill-mode-both", cardClassName)}>
        {open ? children : lastChildren.current}
      </div>
    </div>
  )
}
