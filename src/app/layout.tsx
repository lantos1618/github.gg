import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { NavbarServer } from "@/components/NavbarServer";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { Toaster } from 'sonner'
import { PostHogProvider } from './providers'
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Prevents FOUT causing CLS
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Prevents FOUT causing CLS
});

export const metadata: Metadata = {
  title: {
    default: "GG | The Missing Intelligence Layer for GitHub",
    template: "%s | GG"
  },
  description: "Instant architectural diagrams, quality scores, and AI documentation for any GitHub repository. Stop reading code, start understanding.",
  keywords: ["GitHub analysis", "code visualization", "architectural diagrams", "code quality metrics", "AI documentation", "developer tools", "repo visualization"],
  authors: [{ name: "GG Team" }],
  creator: "GG Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://github.gg",
    title: "GG | The Missing Intelligence Layer for GitHub",
    description: "Instant architectural diagrams, quality scores, and AI documentation for any GitHub repository.",
    siteName: "GG",
    images: [
      {
        url: "/og-image.png", // We'll need to ensure this exists or use a fallback
        width: 1200,
        height: 630,
        alt: "GG - GitHub Intelligence Layer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GG | The Missing Intelligence Layer for GitHub",
    description: "Instant architectural diagrams, quality scores, and AI documentation for any GitHub repository.",
    images: ["/og-image.png"],
    creator: "@github_gg", // Placeholder handle
  },
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
  other: {
    'msvalidate.01': '5D13814D95915D6874F1138BE444F2ED',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Preconnect to critical third-party origins for faster resource loading */}
        <link rel="preconnect" href="https://avatars.githubusercontent.com" />
        <link rel="preconnect" href="https://github.com" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="dns-prefetch" href="https://eu.i.posthog.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "GG",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description": "Instant architectural diagrams, quality scores, and AI documentation for any GitHub repository."
            })
          }}
        />
        <PostHogProvider>
          <TRPCProvider>
            <NavbarServer />
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                position: 'fixed',
                bottom: 12,
                right: 12,
                zIndex: 1000,
                background: '#e11d48',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                letterSpacing: 1,
                fontSize: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                DEV
              </div>
            )}
            <main className="pt-14 flex-1 min-h-[calc(100vh-3.5rem)]">{children}</main>
            <ConditionalFooter />
            <Toaster
              position="bottom-right"
              richColors
              expand={true}
              visibleToasts={5}
              closeButton
              duration={4000}
            />
          </TRPCProvider>
        </PostHogProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
