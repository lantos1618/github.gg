"use client"

import { useState } from "react"
import { StarIcon, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GitHubStarButtonProps {
  initialCount?: number
  initialStarred?: boolean
  className?: string
  onStar?: (starred: boolean) => void
}

export function GitHubStarButton({
  initialCount = 58500,
  initialStarred = false,
  className = "",
  onStar,
}: GitHubStarButtonProps) {
  const [starred, setStarred] = useState(initialStarred)
  const [starCount, setStarCount] = useState(initialCount)

  // Format star count (e.g., 58500 -> 58.5k)
  const formatStarCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(count >= 10000 ? 1 : 2).replace(/\.0$/, "")}k`
    }
    return count.toString()
  }

  const handleStarClick = () => {
    const newStarred = !starred
    setStarred(newStarred)
    setStarCount((prev) => (newStarred ? prev + 1 : prev - 1))
    if (onStar) onStar(newStarred)
  }

  return (
    <div className={`flex ${className}`}>
      <Button
        variant="outline"
        size="sm"
        className={`rounded-r-none border-r-0 bg-zinc-800 hover:bg-zinc-700 border-zinc-700 ${
          starred ? "text-yellow-300" : "text-zinc-300"
        }`}
        onClick={handleStarClick}
      >
        <StarIcon className={`h-4 w-4 mr-2 ${starred ? "fill-yellow-300" : ""}`} />
        Star
        <span className="ml-2">{formatStarCount(starCount)}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-l-none px-2 bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => window.open("https://github.com/lantos1618/github.gg/stargazers", "_blank")}>
            View stargazers
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.open("https://github.com/lantos1618/github.gg/lists", "_blank")}>
            Add to lists
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
