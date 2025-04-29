"use client"

import type React from "react"

import { Suspense } from "react"

interface ClientPageWrapperProps {
  children: React.ReactNode
}

export function ClientPageWrapper({ children }: ClientPageWrapperProps) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
}
