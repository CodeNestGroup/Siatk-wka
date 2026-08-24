"use client"

import { Space_Grotesk } from "next/font/google"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

const display = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] })

export type ConfirmDialogState = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
} | null

type ConfirmDialogProps = {
  state: ConfirmDialogState
  onCancel: () => void
}

// Zastępuje natywne `confirm()` z przeglądarki — brzydkie, niespójne z resztą UI i nie do
// ostylowania. Ten sam mechanizm wejścia/wyjścia co inne modale (przez <Modal>).
export function ConfirmDialog({ state, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={!!state}
      onClose={onCancel}
      overlayClassName="z-[70] bg-[#0B1120]/70 backdrop-blur-sm"
      cardClassName="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
    >
      {state && (
        <>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              state.danger ? "bg-[#FF5A5F]/10 text-[#FF5A5F]" : "bg-[#2C4BFF]/10 text-[#2C4BFF]"
            )}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className={cn(display.className, "text-base font-bold text-slate-900")}>{state.title}</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{state.message}</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onCancel} className="rounded-xl text-xs font-bold cursor-pointer">
              {state.cancelLabel || "Anuluj"}
            </Button>
            <Button
              onClick={state.onConfirm}
              className={cn(
                "rounded-xl text-xs font-bold cursor-pointer active:scale-[0.97] transition-transform",
                state.danger
                  ? "bg-[#FF5A5F] hover:bg-[#E0454A] text-white shadow-md shadow-[#FF5A5F]/30"
                  : "bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white shadow-md shadow-[#2C4BFF]/30"
              )}
            >
              {state.confirmLabel || "Potwierdź"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
