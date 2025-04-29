"use client"

import { useState, useEffect } from "react"

export default function CodeHighlight() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Sample code with syntax highlighting
  const code = `// app/page.tsx
import { getRepository } from '@/lib/github'

export default async function Page({ params }) {
  const repo = await getRepository(params.owner, params.repo)
  
  return (
    <div className="repository-container">
      <h1>{repo.name}</h1>
      <p>{repo.description}</p>
      <div className="stats">
        <span>{repo.stars} ⭐</span>
        <span>{repo.forks} 🍴</span>
      </div>
      {/* File tree and content will render here */}
    </div>
  )
}`

  // Simple syntax highlighting
  const highlightedCode = code
    .replace(/(\/\/.*)/g, '<span class="text-gray-500">$1</span>')
    .replace(/('.*?'|".*?")/g, '<span class="text-yellow-300">$1</span>')
    .replace(
      /\b(import|export|from|async|function|await|return|const|params)\b/g,
      '<span class="text-purple-400">$1</span>',
    )
    .replace(/\b(className|div|span|h1|p)\b/g, '<span class="text-blue-400">$1</span>')
    .replace(/({|}|$$|$$|=>|;)/g, '<span class="text-gray-400">$1</span>')
    .replace(/(@\/.*)/g, '<span class="text-green-400">$1</span>')

  return (
    <div
      className={`font-mono text-xs p-4 rounded-md bg-gray-900/70 border border-border/50 overflow-auto transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
    >
      <pre className="leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  )
}
