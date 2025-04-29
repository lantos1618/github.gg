"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import EmailCaptureModal from "./email-capture-modal"

type PlanType = "free" | "pro" | "ultra" | "team" | "enterprise"

interface EmailModalContextType {
  openModal: (planType: PlanType) => void
  closeModal: () => void
}

const EmailModalContext = createContext<EmailModalContextType | undefined>(undefined)

export function useEmailModal() {
  const context = useContext(EmailModalContext)
  if (!context) {
    throw new Error("useEmailModal must be used within an EmailModalProvider")
  }
  return context
}

export function EmailModalProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [planType, setPlanType] = useState<PlanType>("free")

  useEffect(() => {
    setMounted(true)
  }, [])

  const openModal = (plan: PlanType) => {
    setPlanType(plan)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  const handleSubmit = async (email: string) => {
    // In a real implementation, you would use an email service
    console.log(`Email submitted: ${email} for plan: ${planType}`)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return Promise.resolve()
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <EmailModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <EmailCaptureModal isOpen={isOpen} onClose={closeModal} planType={planType} onSubmit={handleSubmit} />
    </EmailModalContext.Provider>
  )
}
