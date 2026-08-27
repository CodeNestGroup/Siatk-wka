import type { MetadataRoute } from "next"

// Next.js sam serwuje to pod /manifest.webmanifest i dopisuje <link rel="manifest">
// w <head> — to jedyny plik potrzebny do tego, żeby Android (Chrome) w ogóle uznał
// stronę za "instalowalną" i pokazał realny przycisk/baner instalacji.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ESCO VolleyManager",
    short_name: "VolleyManager",
    description: "Menadżer lokalnej siatkówki",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F6FA",
    theme_color: "#0B1120",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
