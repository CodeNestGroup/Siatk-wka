"use client"

import { useEffect, useState } from "react"
import { Share, SquarePlus } from "lucide-react"

// Tylko iOS — na Androidzie jest już prawdziwa natywna appka (przycisk pobierania APK
// obok), więc nie ma sensu dublować tego drugim, konkurencyjnym sposobem instalacji.
// Apple świadomie nie daje żadnego JS-owego API do wywołania "Dodaj do ekranu głównego"
// (w przeciwieństwie do Androida/Chrome z beforeinstallprompt), więc jedyne co można
// tu zrobić to pokazać czytelną instrukcję, gdzie kliknąć w samym Safari.
export function InstallAppPrompt() {
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
    if (isStandalone) return // appka już dodana do ekranu głównego — nic nie pokazujemy

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
    setShowIOSInstructions(isIOS)
  }, [])

  if (!showIOSInstructions) return null

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2C4BFF]/10 text-[#2C4BFF] border border-[#2C4BFF]/20">
        <Share className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-slate-900 flex items-center gap-1">
          Dodaj do ekranu głównego <SquarePlus className="h-3.5 w-3.5 text-[#2C4BFF]" />
        </p>
        <p className="text-[11px] text-slate-400 font-medium">Stuknij ikonę Udostępnij na dole Safari, potem "Dodaj do ekranu głównego"</p>
      </div>
    </div>
  )
}
