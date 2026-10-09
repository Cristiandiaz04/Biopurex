import type { NextConfig } from "next";

// Política de contenido: de dónde puede cargar la página scripts, imágenes y conexiones.
// Supabase (datos, fotos y chat en vivo) y la barra de Vercel en los links de prueba.
// El proyecto de Supabase sale de la variable de entorno: producción y prueba usan bases distintas.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL (ver .env.example)");
const SUPABASE = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const SUPABASE_HOST = new URL(SUPABASE).hostname;
const dev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  // Next mete scripts en línea para hidratar la página; en desarrollo además usa eval.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://vercel.live https://vercel.com`,
  "font-src 'self' data: https://vercel.live",
  `connect-src 'self' ${SUPABASE} wss://${SUPABASE_HOST} https://vercel.live wss://ws-us3.pusher.com`,
  "frame-src https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // AVIF primero (más liviano), WebP de respaldo.
    formats: ["image/avif", "image/webp"],
    // Fotos de productos subidas desde el panel (bucket público "productos" de Supabase).
    remotePatterns: [{ protocol: "https", hostname: SUPABASE_HOST, pathname: "/storage/v1/object/public/productos/**" }],
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
          { key: "Content-Security-Policy", value: CSP },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
