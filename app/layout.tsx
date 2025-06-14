import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import SiteHeader from "@/components/layout/site-header"
import SiteFooter from "@/components/layout/site-footer"
import { ThemeProvider } from "@/components/theme-provider"
import { EmailModalProvider } from "@/components/email-modal-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GitHub.GG - Enhanced GitHub Experience",
  description: "A better way to explore and understand GitHub repositories",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Suspense fallback={null}>
          {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
            <GoogleAnalyticsScript measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
          )}
        </Suspense>
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <EmailModalProvider>
                <div className="relative flex min-h-screen flex-col">
                  <SiteHeader />
                  <div className="flex-1">{children}</div>
                  <SiteFooter />
                  <Toaster position="top-center" richColors closeButton />
                </div>
            </EmailModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

// Server Component for Google Analytics Script
function GoogleAnalyticsScript({ measurementId }: { measurementId: string }) {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `,
        }}
      />
    </>
  )
}
