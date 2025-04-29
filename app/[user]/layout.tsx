import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "User Profile | GitHub.GG",
  description: "View user profile and repositories on GitHub.GG",
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="container mx-auto py-6 px-4 md:px-6">{children}</div>
}
