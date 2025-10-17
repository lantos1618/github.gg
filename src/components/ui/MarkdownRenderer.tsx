import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const rehypeOptions = {
  theme: 'github-dark',
  keepBackground: false,
};

export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => (
  <div className={`markdown-content ${className}`.trim()}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypePrettyCode, rehypeOptions]]}
      components={{
        code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
          return props.inline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
          <pre className="overflow-x-auto rounded-md border bg-muted/50 p-4 my-4" {...props}>
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
