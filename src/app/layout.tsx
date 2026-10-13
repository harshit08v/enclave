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
  alternates: {
    canonical: "https://enclave.vercel.app",
  },
  title: "ENCLAVE — Private by design. Gone when you leave.",
  description: "A private room for conversations that don't need to stay. Ephemeral, end-to-end encrypted rooms that destroy themselves when the last participant leaves.",
  keywords: ["privacy", "E2EE", "ephemeral messaging", "zero-knowledge", "encrypted rooms", "security architecture"],
  authors: [{ name: "ENCLAVE Security & Cryptography Team" }],
  openGraph: {
    title: "ENCLAVE — Ephemeral Private Communication",
    description: "Private by design. Gone when you leave. A private room for conversations that don't need to stay.",
    type: "website",
    url: "https://enclave.vercel.app",
    siteName: "ENCLAVE",
    locale: "en_US",
    images: [
      {
        url: "/logo.jpg",
        width: 800,
        height: 800,
        alt: "ENCLAVE Brand",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ENCLAVE — Ephemeral Private Communication",
    description: "Private by design. Gone when you leave.",
    images: ["/logo.jpg"],
  },
  icons: {
    icon: [
      { url: '/logo.jpg', type: 'image/jpeg' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo.jpg',
    apple: [
      { url: '/logo.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
  },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://enclave.vercel.app/#website",
      "url": "https://enclave.vercel.app",
      "name": "ENCLAVE",
      "description": "Private by design. Ephemeral, end-to-end encrypted rooms that destroy themselves when the last participant leaves.",
      "publisher": {
        "@type": "Organization",
        "name": "ENCLAVE Security",
        "url": "https://enclave.vercel.app",
        "logo": "https://enclave.vercel.app/logo.jpg"
      }
    },
    {
      "@type": "WebApplication",
      "@id": "https://enclave.vercel.app/#webapp",
      "name": "ENCLAVE",
      "url": "https://enclave.vercel.app",
      "applicationCategory": "SecurityApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  ]
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
