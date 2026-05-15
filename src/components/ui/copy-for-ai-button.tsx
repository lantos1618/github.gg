'use client';

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

interface CopyForAIButtonProps {
  /** Raw markdown (or other text) to copy. */
  content: string;
  /** Optional title — if provided, prepended as `# {title}` so the AI has context. */
  title?: string;
  /** Optional context block — e.g. "Source: github.gg scorecard for vercel/next.js" */
  context?: string;
  /** Visual size variant. */
  size?: 'sm' | 'md';
  className?: string;
}

function buildPayload({ content, title, context }: { content: string; title?: string; context?: string }) {
  const parts: string[] = [];
  if (context) parts.push(context.trim());
  if (title) parts.push(`# ${title.trim()}`);
  parts.push(content.trim());
  return parts.join('\n\n');
}

export function CopyForAIButton({ content, title, context, size = 'sm', className = '' }: CopyForAIButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPayload({ content, title, context }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Copy for AI failed:', err);
    }
  };

  const sizeClasses = size === 'md'
    ? 'h-9 px-3 text-sm'
    : 'h-7 px-2 text-xs';
  const iconSize = size === 'md' ? 14 : 12;

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid="copy-for-ai-button"
      aria-label="Copy for AI"
      title="Copy this content for pasting into an AI chat"
      className={`inline-flex items-center gap-1.5 ${sizeClasses} border border-[#111] text-[#111] hover:bg-[#111] hover:text-white transition-colors rounded font-medium ${className}`}
    >
      {copied ? (
        <>
          <Check size={iconSize} />
          Copied
        </>
      ) : (
        <>
          <Sparkles size={iconSize} />
          Copy for AI
        </>
      )}
    </button>
  );
}
