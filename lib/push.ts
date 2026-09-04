// Web Push — obsługa po stronie przeglądarki: sprawdzenie wsparcia, poproszenie o
// zgodę systemową, zapisanie subskrypcji w bazie. Android/Chrome działa wprost;
// iOS (Safari) wymaga NAJPIERW dodania appki do ekranu głównego ("Udostępnij" ->
// "Dodaj do ekranu głównego") — inaczej `PushManager` w ogóle nie istnieje w oknie
// przeglądarki, więc `isPushSupported()` poprawnie zwróci false na zwykłym Safari.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported"
  return Notification.permission
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

// Prosi o zgodę systemową (jeśli jeszcze nie było pytania), subskrybuje przeglądarkę
// i zapisuje subskrypcję w bazie pod danym graczem. Zwraca false gdy użytkownik
// odmówił zgody albo przeglądarka nie wspiera Web Push (np. Safari bez dodania do
// ekranu głównego) — appka ma wtedy jasno pokazać komunikat zamiast cichej porażki.
export async function subscribeToPush(playerId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    })
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, subscription: subscription.toJSON() })
  })

  return res.ok
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription()
  if (!subscription) return

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  })

  await subscription.unsubscribe()
}

// Wywoływane po utworzeniu meczu/ogłoszenia/wpłaty — fire-and-forget, appka nie
// czeka na wynik i nie blokuje na tym reszty zapisu (brak zapisanych urządzeń albo
// chwilowy błąd wysyłki nie powinien nigdy przerwać samej operacji tworzenia).
export function notifyPush(payload: { title: string; body: string; url?: string; excludePlayerId?: string }) {
  fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {})
}
