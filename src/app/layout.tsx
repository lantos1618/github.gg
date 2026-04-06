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
import { SessionProvider, type SessionHint } from '@/lib/session-context';
import { PageWidthProvider } from '@/lib/page-width-context';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { userSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import '@/lib/boneyard-config';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read session from cookie server-side — ~1ms, no DB hit on cache
  let sessionHint: SessionHint | null = null;
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    if (session?.user) {
      // better-auth includes additionalFields (githubUsername) on the user object
      const user = session.user as typeof session.user & { githubUsername?: string };
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());
      // Fetch plan with a single lightweight DB query
      let plan: string | null = null;
      try {
        const sub = await db.query.userSubscriptions.findFirst({
          where: eq(userSubscriptions.userId, user.id),
          columns: { plan: true, status: true },
        });
        if (sub?.status === 'active') plan = sub.plan;
      } catch { /* no plan */ }

      sessionHint = {
        userId: user.id,
        name: user.name ?? null,
        image: user.image ?? null,
        githubUsername: user.githubUsername ?? null,
        plan,
        isAdmin,
      };
    }
  } catch {
    // No session — anonymous user
  }

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical third-party origins for faster resource loading */}
        <link rel="preconnect" href="https://avatars.githubusercontent.com" />
        <link rel="preconnect" href="https://github.com" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="dns-prefetch" href="https://eu.i.posthog.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning
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
        <a href="#main-content" data-testid="layout-skip-to-content-link" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md">
          Skip to main content
        </a>
        <PostHogProvider>
          <TRPCProvider>
            <SessionProvider hint={sessionHint}>
            <PageWidthProvider>
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
            <main id="main-content" data-testid="layout-main-content" className="pt-14 flex-1 min-h-[calc(100vh-3.5rem)]">{children}</main>
            <ConditionalFooter />
            <Toaster
              position="bottom-right"
              richColors
              expand={true}
              visibleToasts={5}
              closeButton
              duration={4000}
            />
          </PageWidthProvider>
          </SessionProvider>
          </TRPCProvider>
        </PostHogProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
