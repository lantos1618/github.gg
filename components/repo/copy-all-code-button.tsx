'use client'

import { Button } from "@/components/ui/button"
import { Copy, Check, Loader2 } from "lucide-react"
import { useCopyAllCode } from "@/hooks/use-copy-all-code"
import { useState } from "react"
import { toast } from "sonner"

interface CopyAllCodeButtonProps {
  owner: string
  repo: string
  branch?: string
  className?: string
}

export function CopyAllCodeButton({ owner, repo, branch, className }: CopyAllCodeButtonProps) {
  const [isCopied, setIsCopied] = useState(false)
  const { copyAllCode, isLoading, error } = useCopyAllCode()

  const handleCopyAllCode = async () => {
    try {
      const content = await copyAllCode(owner, repo, branch)
      
      // Copy to clipboard
      await navigator.clipboard.writeText(content || '')
      
      // Show success feedback
      setIsCopied(true)
      toast.success('All code copied to clipboard!')
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy all code:', err)
      toast.error(error || 'Failed to copy code. Please try again.')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopyAllCode}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Copying...
        </>
      ) : isCopied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copy All Code
        </>
      )}
    </Button>
  )
}

export default CopyAllCodeButton
