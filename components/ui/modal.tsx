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
    // Zewnętrzna warstwa NIE steruje już wyrównaniem — tylko pozycją/tłem/scrollem. Z samym
    // `items-end` na kontenerze `fixed` treść wyższa niż ekran (np. pełny skład meczu) miała
    // swój górny fragment (łącznie z X) renderowany POZA widocznym obszarem i NIE dało się
    // do niego przewinąć — to klasyczna pułapka `align-items: flex-end` + overflow w CSS.
    // `min-h-full` na wewnętrznej warstwie naprawia to: gdy treść mieści się na ekranie,
    // wygląda jak dotychczas (przyklejona do dołu na telefonie); gdy jest wyższa, to WŁAŚNIE
    // ten kontener rośnie, a scroll zewnętrznej warstwy naturalnie odsłania całość od góry.
    <div
      className={cn(
        "fixed inset-0 z-50 overflow-y-auto",
        closing ? "animate-out fade-out duration-150 fill-mode-both" : "animate-in fade-in duration-200 fill-mode-both",
        overlayClassName
      )}
    >
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
        className="flex min-h-full items-end justify-center p-3 pb-3 sm:items-center sm:p-4"
      >
        <div
          className={cn(
            // Na telefonie karta wjeżdża z dołu jak natywny "bottom sheet" (arkusz akcji z iOS) —
            // dokładniej odpowiada temu, jak zachowują się modale w prawdziwych appkach na
            // dotykowym ekranie, zamiast wyśrodkowanego okienka rodem z desktopowej strony www.
            // Od `sm:` wzwyż (mysz, więcej miejsca) wraca klasyczne wyśrodkowane okno.
            // Szerokość celowo NIE jest tu ustawiana — każde wywołanie i tak podaje własne
            // `w-full max-w-*` w `cardClassName`. Dodanie tu bazowego `sm:w-auto` psuło to:
            // wewnątrz flex-boxa "auto" znaczy "dopasuj do treści", a nie "wypełnij do
            // max-width", więc modale z szerszym max-w-* na desktopie i tak zostawały wąskie.
            "relative",
            closing
              ? "animate-out fade-out slide-out-to-bottom-10 sm:zoom-out-95 sm:slide-out-to-bottom-0 duration-150 fill-mode-both"
              : "animate-in fade-in slide-in-from-bottom-10 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-300 sm:duration-200 fill-mode-both",
            cardClassName
          )}
        >
          {/* "Uchwyt" znany z arkuszy iOS — czysto dekoracyjny sygnał "to da się przeciągnąć/
              zamknąć", widoczny tylko na telefonie, nie zaburza własnego paddingu treści modala. */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-black/15 pointer-events-none" />
          {open ? children : lastChildren.current}
        </div>
      </div>
    </div>
  )
}
