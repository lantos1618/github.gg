'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useShikiHighlighter } from 'react-shiki';

interface MarkdownCardRendererProps {
  markdown: string;
  title: string;
  description?: string;
  minHeight?: string;
  maxHeight?: string;
}

const CodeBlock = ({ lang, code }: { lang: string; code: string }) => {
  const highlighted = useShikiHighlighter(code, lang, {
    light: 'github-light',
    dark: 'github-dark',
  });

  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden border border-border bg-[#f6f8fa] dark:bg-[#161b22] shadow-sm">
      <div className="overflow-x-auto [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:!bg-transparent [&_pre]:!text-sm">
        {highlighted}
      </div>
    </div>
  );
};

export function MarkdownCardRenderer({
  markdown,
  title,
  description,
  minHeight = '400px',
}: MarkdownCardRendererProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div
          className="markdown-content rounded-md border border-input bg-background p-6"
          style={{ minHeight }}
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
                  <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...rest}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
