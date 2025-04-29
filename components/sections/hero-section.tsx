"use client"

import { SlideIn } from "@/components/animated-elements"
import UrlAnimation from "@/components/url-animation"
import { Button } from "@/components/ui/button"
import { SendIcon } from "lucide-react"
import { useState } from "react"

export default function HeroSection() {
  const [message, setMessage] = useState("")

  return (
    <section className="flex-1 flex flex-col justify-center py-12 md:py-20 px-4 w-full mx-auto items-center text-center">
      <SlideIn direction="up" duration={0.8} className="w-full">
        <UrlAnimation />
      </SlideIn>

      <div className="mt-8 w-full max-w-2xl mx-auto">
        <div className="bg-black/40 border border-border/50 rounded-lg p-4 shadow-lg">
          <div className="min-h-[200px] mb-4 text-left">
            <div className="bg-primary/10 rounded-lg p-3 mb-3 inline-block max-w-[80%]">
              <p className="text-sm text-primary-foreground">
                Hi there! I can help you understand any GitHub repository. Just paste a GitHub URL or ask me a question
                about a codebase.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about a repository or paste a GitHub URL..."
              className="flex-1 bg-background/80 border border-border/50 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button size="sm" className="gap-2">
              <SendIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
