// Bardzo świadomie minimalny service worker — NIE cache'uje zapytań do Supabase (dane mają
// być zawsze aktualne), tylko: (1) pozwala appce "zainstalować się" jako PWA (Android/Chrome
// tego wymaga), (2) gdy zabraknie sieci, pokazuje ostatnio załadowaną stronę zamiast białego
// błędu przeglądarki, (3) cache'uje obrazy/ikony żeby appka otwierała się szybciej.
const CACHE_NAME = "volleymanager-shell-v2"

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  // Nawigacje (otwarcie/przejście strony) — najpierw sieć; offline = ostatnia zapisana wersja
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    )
    return
  }

  // Obrazy/ikony/fonty — cache najpierw, przyspiesza kolejne otwarcia i działa offline
  if (request.destination === "image" || request.destination === "font") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
      })
    )
  }
})

// Prawdziwe powiadomienie systemowe — to właśnie to sprawia, że telefon/desktop
// "buczy" nawet gdy appka jest zamknięta. Payload wysyłany jest jako JSON z
// /api/push/send (patrz ten plik po stronie serwera).
self.addEventListener("push", (event) => {
  let payload = { title: "ESCO VolleyManager", body: "Coś nowego w appce.", url: "/" }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
      tag: payload.tag || undefined
    })
  )
})

// Klik w powiadomienie systemowe — jeśli appka jest już otwarta w jakiejś karcie,
// przełącza na nią zamiast otwierać drugą; inaczej otwiera nową.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
