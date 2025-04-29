import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import SiteHeader from "@/components/layout/site-header"
import { EmailModalProvider } from "@/components/email-modal-provider"
import GoogleAnalytics from "@/components/analytics/google-analytics"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GitHub.GG - Understand Code Instantly with AI",
  description: "GitHub.GG is an AI-powered tool that provides instant insights and summaries for GitHub repositories.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleAnalytics />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <EmailModalProvider>
            <div className="flex flex-col min-h-screen">
              <SiteHeader />
              <Suspense>
                <div className="flex-1">{children}</div>
              </Suspense>
            </div>
          </EmailModalProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
