'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
