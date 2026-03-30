'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface MarkdownCardRendererProps {
  markdown: string;
  title: string;
  description?: string;
  minHeight?: string;
  maxHeight?: string;
}

export function MarkdownCardRenderer({
  markdown,
  title,
  description,
}: MarkdownCardRendererProps) {
  return (
    <div data-testid="markdown-card">
      {/* Section label */}
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
        {title}
      </div>
      {description && (
        <p className="text-[14px] text-[#aaa] mb-4">{description}</p>
      )}
      <div className="border-b border-[#eee] mb-6" />
      <MarkdownRenderer content={markdown} />
    </div>
  );
}
