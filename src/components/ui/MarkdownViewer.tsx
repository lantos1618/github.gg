import { cn } from '@/lib/utils';

interface MarkdownViewerProps {
  html: string;
  className?: string;
}

/**
 * Server-side rendered markdown viewer
 * Displays pre-rendered HTML from server-side markdown processing
 * No client-side JavaScript needed for initial render
 */
export function MarkdownViewer({ html, className = '' }: MarkdownViewerProps) {
  return (
    <div
      className={cn(
        'prose prose-slate dark:prose-invert max-w-none',
        'prose-headings:scroll-mt-20', // Add scroll margin for anchor links
        'prose-pre:bg-gray-900 prose-pre:text-gray-100',
        'prose-code:text-pink-600 dark:prose-code:text-pink-400',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-a:text-blue-600 dark:prose-a:text-blue-400',
        'prose-img:rounded-lg prose-img:shadow-md',
        'prose-table:border-collapse',
        'prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-700',
        'prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-700',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
