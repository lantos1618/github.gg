'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { CopyForAIButton } from '@/components/ui/copy-for-ai-button';

interface MarkdownCardRendererProps {
  markdown: string;
  title: string;
  description?: string;
  minHeight?: string;
  maxHeight?: string;
  /** Optional context (e.g. "vercel/next.js scorecard") prepended to AI copy payload. */
  copyContext?: string;
  /** Hide the Copy for AI button. Defaults to false. */
  hideCopyForAI?: boolean;
}

export function MarkdownCardRenderer({
  markdown,
  title,
  description,
  copyContext,
  hideCopyForAI = false,
}: MarkdownCardRendererProps) {
  return (
    <div data-testid="markdown-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">
          {title}
        </div>
        {!hideCopyForAI && (
          <CopyForAIButton content={markdown} title={title} context={copyContext} />
        )}
      </div>
      {description && (
        <p className="text-base text-[#aaa] mb-4">{description}</p>
      )}
      <div className="border-b border-[#eee] mb-6" />
      <MarkdownRenderer content={markdown} />
    </div>
  );
}
