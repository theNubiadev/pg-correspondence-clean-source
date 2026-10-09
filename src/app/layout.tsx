import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { APP_NAME, ORG_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: `Official correspondence register for ${ORG_NAME}. Every letter received is logged, routed and tracked until it is completed.`,
  applicationName: APP_NAME,
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/apple-icon.png",
  },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0A2B4F" },
    { media: "(prefers-color-scheme: dark)", color: "#080C14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-NG"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="font-sans min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
