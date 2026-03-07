'use client';

import { useShikiHighlighter } from 'react-shiki';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  lang: string;
  code: string;
  className?: string;
}

export const CodeBlock = ({ lang, code, className }: CodeBlockProps) => {
  const highlighted = useShikiHighlighter(code, lang, {
    light: 'github-light',
    dark: 'github-dark',
  });

  return (
    <div
      className={cn(
        'not-prose my-4 rounded-lg overflow-hidden border border-border bg-[#f6f8fa] dark:bg-[#161b22] shadow-sm',
        className
      )}
    >
      <div className="overflow-x-auto [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:!bg-transparent [&_pre]:!text-sm">
        {highlighted}
      </div>
    </div>
  );
};
