import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta solo lo necesario para producción (server + deps trazadas).
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  turbopack: {
    root: process.cwd(),
  },

  // Librerías con binarios nativos o pesadas: no re-empaquetar en el server bundle.
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "xlsx",
    "mammoth",
    "pdf-parse",
    "openai",
    "bcryptjs",
  ],

  experimental: {
    // Tree-shaking agresivo de iconos (evita importar los ~1500 iconos de lucide).
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  async headers() {
    return [
      {
        source: "/((?!_next/static|favicon.ico).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
