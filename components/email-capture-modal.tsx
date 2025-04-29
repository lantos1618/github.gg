"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GithubIcon } from "lucide-react"

interface EmailCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  planType: "free" | "pro" | "ultra" | "team" | "enterprise"
  onSubmit: (email: string) => Promise<void>
}

export default function EmailCaptureModal({ isOpen, onClose, planType, onSubmit }: EmailCaptureModalProps) {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Basic email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(email)
      setSuccess(true)
      // Close modal after 2 seconds of showing success
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setEmail("")
      }, 2000)
    } catch (err) {
      setError("Failed to submit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const planTitles = {
    free: "Free Plan",
    pro: "Pro Plan",
    ultra: "ULTRA Plan",
    team: "Team Plan",
    enterprise: "Enterprise Plan",
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Interested in {planTitles[planType]}?</DialogTitle>
          <DialogDescription>Enter your email to get more information about our {planType} plan.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <div className="mb-4 text-primary text-5xl">✓</div>
            <p className="text-lg font-medium">Thank you!</p>
            <p className="text-muted-foreground">We'll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-input"
                  required
                />
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>
            </div>
            <DialogFooter>
              {planType === "free" ? (
                <Button type="button" className="w-full gap-2" onClick={onClose}>
                  <GithubIcon className="h-4 w-4" />
                  Sign in with GitHub
                </Button>
              ) : (
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Get More Info"}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
