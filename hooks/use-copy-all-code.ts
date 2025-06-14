import { useState } from 'react'
import { useSession } from 'next-auth/react'

export function useCopyAllCode() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const { data: session } = useSession()

  const copyAllCode = async (owner: string, repo: string, branch?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/copy-all-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo,
          branch,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy all code')
      }

      setContent(data.content)
      return data.content
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    copyAllCode,
    isLoading,
    error,
    content,
    isAuthenticated: !!session,
  }
}

export default useCopyAllCode
