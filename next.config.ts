import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the round "N" Next.js dev tools button in development. It never appears in production anyway.
  devIndicators: false,
  // Kaizen is per-user and request-time throughout (sessions, progress, quiz state),
  // so Cache Components would only add Suspense plumbing with nothing to prerender.
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["@node-rs/argon2"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
