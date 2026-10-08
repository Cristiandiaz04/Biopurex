import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // Fotos de productos subidas desde el panel (bucket público "productos" de Supabase).
    remotePatterns: [{ protocol: "https", hostname: "dunejdzectfkwakpxnvj.supabase.co", pathname: "/storage/v1/object/public/productos/**" }],
  },
  partialPrefetching: true,
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
