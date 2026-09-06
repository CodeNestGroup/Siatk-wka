"use client"

/**
 * ServiceWorkerRegister — rejestracja service workera PWA
 *
 * Co to jest: mały komponent bez UI (`return null`), którego jedynym zadaniem jest zarejestrować
 * plik public/sw.js jako service worker przy starcie apki.
 * Eksportuje / robi: komponent `ServiceWorkerRegister`.
 * Używany przez: app/layout.tsx — montowany raz, globalnie, w root layoucie.
 * Uwagi: bez tego przeglądarka nie wie, że apka ma service workera, więc Chrome/Android nigdy
 * nie pokaże jej jako "instalowalną" (PWA) — patrz komentarz niżej.
 */

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
