"use client"

import type React from "react"

import { useState } from "react"
import { GithubIcon, Code2Icon, MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GitHubStarButton } from "@/components/ui/github-star-button"

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    // Only handle smooth scrolling on the homepage
    if (isHomePage) {
      e.preventDefault()
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
        setMobileMenuOpen(false)
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <Code2Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
            GitHub.GG
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href={isHomePage ? "#features" : "/#features"}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => handleSectionClick(e, "features")}
          >
            Features
          </Link>
          <Link
            href={isHomePage ? "#pricing" : "/#pricing"}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => handleSectionClick(e, "pricing")}
          >
            Pricing
          </Link>
          <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Docs
          </Link>

          {/* GitHub-style Star Button */}
          <GitHubStarButton />
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" size="sm" className="gap-2">
            <GithubIcon className="h-4 w-4" />
            Sign In with GitHub
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            Try Now
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <Button variant="ghost" size="sm" className="p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <MenuIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 border-b border-border/40 py-4">
          <div className="container flex flex-col space-y-4">
            <Link
              href={isHomePage ? "#features" : "/#features"}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={(e) => handleSectionClick(e, "features")}
            >
              Features
            </Link>
            <Link
              href={isHomePage ? "#pricing" : "/#pricing"}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={(e) => handleSectionClick(e, "pricing")}
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
            >
              Docs
            </Link>

            {/* Mobile GitHub-style Star Button */}
            <GitHubStarButton className="w-full" />

            <div className="flex flex-col space-y-3 pt-2">
              <Button variant="outline" size="sm" className="justify-center gap-2 w-full">
                <GithubIcon className="h-4 w-4" />
                Sign In with GitHub
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 w-full">
                Try Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
