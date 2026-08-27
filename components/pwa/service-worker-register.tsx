"use client"

import { useEffect } from "react"

// Rejestruje public/sw.js po stronie klienta — bez tego przeglądarka w ogóle nie wie,
// że appka ma service workera, więc Chrome/Android nigdy nie uznałby jej za "instalowalną".
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  return null
}
