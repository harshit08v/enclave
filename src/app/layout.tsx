import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ENCLAVE — Private by design. Gone when you leave.",
  description: "A private room for conversations that don't need to stay. Ephemeral, end-to-end encrypted rooms that destroy themselves when the last participant leaves.",
  keywords: ["privacy", "E2EE", "ephemeral messaging", "zero-knowledge", "encrypted rooms", "security architecture"],
  authors: [{ name: "ENCLAVE Security & Cryptography Team" }],
  openGraph: {
    title: "ENCLAVE — Ephemeral Private Communication",
    description: "Private by design. Gone when you leave. A private room for conversations that don't need to stay.",
    type: "website",
    url: "https://enclave.app",
    siteName: "ENCLAVE",
  },
  twitter: {
    card: "summary_large_image",
    title: "ENCLAVE — Ephemeral Private Communication",
    description: "Private by design. Gone when you leave.",
  },
  robots: "index, follow",
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
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('enclave_theme');
                  var isDark = false;
                  if (stored === 'dark') {
                    isDark = true;
                  } else if (stored === 'light') {
                    isDark = false;
                  } else {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
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
