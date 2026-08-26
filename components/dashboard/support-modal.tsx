"use client"

import { useEffect, useState } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import { Coffee, X } from "lucide-react"
import QRCode from "qrcode"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

const display = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600"] })

// Wspólny modal wsparcia (BLIK + QR) — wcześniej każda strona miała własną kopię tej
// logiki (i różniły się w szczegółach). Jeden komponent = zawsze ten sam wygląd i dane.
const DEFAULT_BLIK_DISPLAY = "+48 500 000 000"
const DEFAULT_BLIK_DIGITS = "500000000"

export function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [blikDisplay, setBlikDisplay] = useState(DEFAULT_BLIK_DISPLAY)
  const [blikDigits, setBlikDigits] = useState(DEFAULT_BLIK_DIGITS)

  // Numer BLIK jest konfigurowalny w Ustawieniach (admin) — czytamy go stąd zamiast trzymać
  // na sztywno, żeby "Zapisz dane do wpłat" faktycznie coś zmieniało w tym oknie.
  useEffect(() => {
    function loadFromStorage() {
      const savedDisplay = localStorage.getItem("volley_blik_display")
      const savedDigits = localStorage.getItem("volley_blik_digits")
      setBlikDisplay(savedDisplay || DEFAULT_BLIK_DISPLAY)
      setBlikDigits(savedDigits || DEFAULT_BLIK_DIGITS)
    }

    loadFromStorage()
    window.addEventListener("volley-blik-updated", loadFromStorage)
    return () => window.removeEventListener("volley-blik-updated", loadFromStorage)
  }, [])

  useEffect(() => {
    QRCode.toDataURL(blikDigits, { margin: 1, width: 240, color: { dark: "#0B1120", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [blikDigits])

  return (
    <Modal
      open={open}
      onClose={onClose}
      overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm overflow-y-auto"
      cardClassName="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-4 my-8 text-slate-900 text-center"
    >
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF]">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FFD23F]/15 text-[#B8860B] shadow-md shadow-[#FFD23F]/10">
          <Coffee className="h-8 w-8" />
        </div>
        <h2 className={cn(display.className, "text-xl font-bold text-slate-900")}>Postaw kawę drużynie!</h2>
        <p className="text-xs text-slate-500 font-medium max-w-xs">
          Każda dobrowolna wpłata pomaga nam utrzymać serwery, kupować nowe piłki i sprzęt na treningi.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Kod QR z numerem BLIK"
              className="h-20 w-20 rounded-xl border border-slate-200 bg-white shrink-0"
            />
          )}
          <div className="text-left space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Numer telefonu BLIK</span>
            <p className={cn(score.className, "text-sm font-semibold text-slate-900 tabular-nums")}>{blikDisplay}</p>
            <p className="text-[10px] text-slate-400 font-medium">Zeskanuj kod w aplikacji bankowej</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFD23F]/10 border border-[#FFD23F]/25 text-left text-xs font-semibold text-[#7A5C00]">
          Dziękujemy za każdą cegiełkę — to dzięki Wam ta grupa gra w siatkówkę co tydzień!
        </div>
      </div>
    </Modal>
  )
}
