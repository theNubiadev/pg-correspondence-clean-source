import type { NextConfig } from "next";
import os from "node:os";
import path from "node:path";

/** LAN / hotspot addresses so other PCs can load /_next/* in `next dev`. */
function localDevOrigins(): string[] {
  const origins = new Set<string>(["10.0.4.*", "192.168.137.*"]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.internal) continue;
      if (addr.family === "IPv4" || addr.family === 4) {
        origins.add(addr.address);
      }
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  /*
   * This project sits inside a directory that contains other lockfiles, which
   * makes Next's workspace-root inference pick the wrong folder. Pinning the
   * root keeps file tracing (and therefore standalone output) correct.
   */
  outputFileTracingRoot: path.join(__dirname),

  reactStrictMode: true,
  poweredByHeader: false,

  /*
   * Binding with -H 0.0.0.0 means the server hostname is not your LAN IP.
   * Other PCs open http://<LAN-IP>:3000 — list those hosts here or Next
   * blocks /_next/* (and login appears broken).
   */
  allowedDevOrigins: localDevOrigins(),

  experimental: {
    /* Keeps Server Action payloads large enough for a scanned letter upload. */
    serverActions: { bodySizeLimit: "26mb" },
  },

  images: {
    /*
     * Attachment previews are served through our own signed-URL route, and the
     * crest is a local asset, so no remote patterns are required. Anything
     * added here would widen the surface for SSRF through the image optimiser.
     */
    remotePatterns: [],
  },

  eslint: {
    /* Keep `next build` usable when the type/lint worker OOMs on this machine. */
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        /* An internal register must never be cached by an intermediary. */
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
