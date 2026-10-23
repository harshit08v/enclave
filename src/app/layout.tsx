import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#111210" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://enclave.vercel.app"),
  applicationName: "ENCLAVE",
  alternates: {
    canonical: "https://enclave.vercel.app",
  },
  title: "ENCLAVE | Private by Design",
  description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
  keywords: [
    "ENCLAVE",
    "privacy",
    "E2EE",
    "ephemeral messaging",
    "zero-knowledge",
    "encrypted rooms",
    "security architecture",
  ],
  authors: [{ name: "ENCLAVE Security & Cryptography Team" }],
  creator: "ENCLAVE",
  publisher: "ENCLAVE",
  openGraph: {
    title: "ENCLAVE | Private by Design",
    description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
    type: "website",
    url: "https://enclave.vercel.app",
    siteName: "ENCLAVE",
    locale: "en_US",
    images: [
      {
        url: "/logo.jpg",
        width: 1024,
        height: 1024,
        alt: "ENCLAVE Brand Emblem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ENCLAVE | Private by Design",
    description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
    images: ["/logo.jpg"],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
      { url: '/icon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "google89d9b243e4d82670",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
