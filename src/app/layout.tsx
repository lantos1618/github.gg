import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { NavbarServer } from "@/components/NavbarServer";
import { Footer } from "@/components/Footer";
import { Toaster } from 'sonner'
import { PostHogProvider } from './providers'
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "gh.gg",
  description: "gh.gg - The missing intelligence layer for GitHub",
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
            <main>{children}</main>
            <Footer />
            <Toaster position="top-right" richColors />
          </TRPCProvider>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
