import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // Fotos de productos subidas desde el panel (bucket público "productos" de Supabase).
    remotePatterns: [{ protocol: "https", hostname: "dunejdzectfkwakpxnvj.supabase.co", pathname: "/storage/v1/object/public/productos/**" }],
  },
  partialPrefetching: true,
  poweredByHeader: false,
  // Headers de seguridad para todo el sitio: no se puede incrustar en otros sitios (clickjacking),
  // el navegador no adivina tipos de archivo y no se filtra la URL completa a otros dominios.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
