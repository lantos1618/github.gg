"use client"

import type React from "react"

import Link from "next/link"
import { Code2Icon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useCallback } from "react"

export default function SiteFooter() {
  const pathname = usePathname()

  // Function to handle smooth scrolling for anchor links on homepage
  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      // Only handle anchor scrolling on homepage
      if (pathname === "/") {
        e.preventDefault()
        const section = document.getElementById(sectionId)
        if (section) {
          window.scrollTo({
            top: section.offsetTop - 80, // Offset for header
            behavior: "smooth",
          })
        }
      }
    },
    [pathname],
  )

  // Function to generate the correct link for sections that exist on homepage
  const getSectionLink = useCallback(
    (sectionName: string) => {
      const homepageSections = ["features", "pricing", "testimonials"]
      const sectionId = sectionName.toLowerCase()

      if (homepageSections.includes(sectionId)) {
        // If we're on homepage, use anchor link, otherwise link to homepage with anchor
        return pathname === "/" ? `#${sectionId}` : `/#${sectionId}`
      }

      // For other pages, use regular path
      return `/${sectionId}`
    },
    [pathname],
  )

  return (
    <footer className="bg-black/70 border-t border-border/40 py-10 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="md:w-1/3">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <Code2Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                GitHub.GG
              </span>
            </Link>
            <p className="text-muted-foreground mb-4">Unlock the power of AI to understand code instantly.</p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary">
                Twitter
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                GitHub
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                Discord
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 md:w-2/3">
            <div>
              <h3 className="font-medium mb-3">Product</h3>
              <ul className="space-y-2">
                {[
                  { name: "Features", id: "features" },
                  { name: "Pricing", id: "pricing" },
                  { name: "Testimonials", id: "testimonials" },
                  { name: "FAQ", id: "faq" },
                ].map((item) => (
                  <li key={item.id}>
                    <Link
                      href={getSectionLink(item.id)}
                      onClick={(e) => handleAnchorClick(e, item.id)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-3">Resources</h3>
              <ul className="space-y-2">
                {["Documentation", "API", "Blog", "Community"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href={`/${item.toLowerCase()}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-3">Company</h3>
              <ul className="space-y-2">
                {["About", "Team", "Careers", "Contact"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href={`/${item.toLowerCase()}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 mt-8 md:mt-12 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} GitHub.GG. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
