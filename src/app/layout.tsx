import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_JP } from "next/font/google";
import { ToastHost } from "@/components/app/ToastHost";
import "./globals.css";

// Both fonts are downloaded at build time and served from our own origin (PRD 12.3),
// so the running app makes no request to Google. Geist covers Latin text; Noto Sans JP
// covers Japanese, which the browser picks glyph by glyph.
const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});
const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-jp",
});

export const metadata: Metadata = {
  title: { default: "Kaizen", template: "%s | Kaizen" },
  description: "Learn to speak short, polite Japanese with your colleagues. A few minutes a day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${notoSansJp.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
