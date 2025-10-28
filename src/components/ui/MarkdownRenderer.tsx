'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useShikiHighlighter } from 'react-shiki';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const CodeBlock = ({ lang, code }: { lang: string; code: string }) => {
  const highlighted = useShikiHighlighter(code, lang, {
    light: 'github-light',
    dark: 'github-dark',
  });

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-lg my-6 text-sm">
      {highlighted}
    </div>
  );
};

export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => (
  <div className={`prose prose-slate dark:prose-invert max-w-none
    prose-headings:scroll-mt-20 prose-headings:font-bold prose-headings:tracking-tight
    prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8
    prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-border
    prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
    prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3
    prose-p:leading-7 prose-p:text-[15px] prose-p:mb-4
    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-a:transition-all
    prose-strong:text-foreground prose-strong:font-semibold
    prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-code:font-medium
    prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-6 prose-pre:overflow-hidden
    prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6 prose-li:my-2 prose-li:text-[15px]
    prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:my-6 prose-blockquote:not-italic
    prose-img:rounded-xl prose-img:shadow-xl prose-img:my-8 prose-img:border prose-img:border-border
    prose-table:border prose-table:border-border prose-table:my-6 prose-table:w-full
    prose-thead:bg-muted prose-thead:border-b prose-thead:border-border
    prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-sm
    prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-border prose-td:text-sm
    prose-hr:my-8 prose-hr:border-border
    ${className}`.trim()}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { className, children, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const isInline = !node || node.position?.start.line === node.position?.end.line;

          if (!isInline && match) {
            return <CodeBlock lang={match[1]} code={codeString} />;
          }

          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
        a({ href, children, ...props }) {
          const isExternal = href?.startsWith('http');
          return (
            <a
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
              {isExternal && <span className="ml-1 text-xs">↗</span>}
            </a>
          );
        },
        table({ children, ...props }) {
          return (
            <div className="overflow-x-auto my-6 rounded-lg border border-border">
              <table {...props}>{children}</table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
