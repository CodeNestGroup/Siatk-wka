// Bardzo świadomie minimalny service worker — NIE cache'uje zapytań do Supabase (dane mają
// być zawsze aktualne), tylko: (1) pozwala appce "zainstalować się" jako PWA (Android/Chrome
// tego wymaga), (2) gdy zabraknie sieci, pokazuje ostatnio załadowaną stronę zamiast białego
// błędu przeglądarki, (3) cache'uje obrazy/ikony żeby appka otwierała się szybciej.
const CACHE_NAME = "volleymanager-shell-v1"

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
