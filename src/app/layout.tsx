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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
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
