/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Bez tego serwer deweloperski odrzuca zasoby (m.in. HMR) przy wejściu z telefonu przez
  // adres LAN Maca — Next.js domyślnie ufa tylko "localhost" ze względów bezpieczeństwa.
  // Next.js dopuszcza tu tylko dokładne hosty/wildcardy domenowe, nie zakresy CIDR — stąd
  // konkretny adres IP Maca w sieci hotspotu, a nie cała podsieć.
  allowedDevOrigins: ["172.20.10.7"],
}

export default nextConfig
