'use client'

import { signIn } from 'next-auth/react'
import { cn } from "@/lib/utils"

interface LoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function LoginButton({ className, ...props }: LoginButtonProps) {
  return (
    <button
      onClick={() => signIn('github')}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200",
        className
      )}
      {...props}
    >
      Sign in with GitHub
    </button>
  )
}
