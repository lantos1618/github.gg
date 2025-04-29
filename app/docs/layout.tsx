import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "GitHub.GG - Documentation",
  description:
    "A powerful tool for analyzing GitHub repositories and providing valuable insights about code quality, dependencies, and more.",
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
