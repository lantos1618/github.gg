import React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full bg-transparent border-0 border-b-2 border-[#ddd] px-0 py-2 text-base text-[#111] placeholder:text-[#ccc] hover:border-[#888] focus:border-[#111] focus:text-[#000] focus:placeholder:text-[#999] focus:outline-none focus:ring-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
