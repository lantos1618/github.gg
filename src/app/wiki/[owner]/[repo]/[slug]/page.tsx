import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, Clock, Eye, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { createCaller } from '@/lib/trpc/server';
import { incrementViewCount } from './actions';

interface WikiPageProps {
  params: Promise<{
    owner: string;
    repo: string;
    slug: string;
  }>;
  searchParams: Promise<{
    version?: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: WikiPageProps): Promise<Metadata> {
  const { owner, repo, slug } = await params;
  const { version } = await searchParams;

  const caller = await createCaller();
  const page = await caller.wiki.getWikiPage({
    owner,
    repo,
    slug,
    version: version ? parseInt(version) : undefined,
  });

  if (!page) {
    return {
      title: 'Wiki Page Not Found',
    };
  }

  const title = `${page.title} - ${owner}/${repo} Documentation`;
  const description = page.summary || `Documentation for ${owner}/${repo}`;

  return {
    title,
    description,
    keywords: (page.metadata as { keywords?: string[] })?.keywords || [owner, repo, 'documentation', 'wiki'],
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://github.gg/wiki/${owner}/${repo}/${slug}`,
      siteName: 'gh.gg',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: page.isPublic,
      follow: page.isPublic,
    },
  };
}

export default async function WikiPage({ params, searchParams }: WikiPageProps) {
  const { owner, repo, slug } = await params;
  const { version } = await searchParams;

  const caller = await createCaller();
  const [page, toc] = await Promise.all([
    caller.wiki.getWikiPage({
      owner,
      repo,
      slug,
      version: version ? parseInt(version) : undefined,
    }),
    caller.wiki.getWikiTableOfContents({
      owner,
      repo,
      version: version ? parseInt(version) : undefined,
    }),
  ]);

  if (!page) {
    notFound();
  }

  // Increment view count (server action)
  incrementViewCount({ owner, repo, slug, version: page.version });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href={`/${owner}/${repo}`}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{owner}/{repo}</span>
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">{page.viewCount}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-medium">v{page.version}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          {/* Table of Contents Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-sm uppercase tracking-wide">
                  Documentation
                </h2>
              </div>
              <nav className="space-y-1">
                {toc.pages.map((tocPage) => (
                  <Link
                    key={tocPage.slug}
                    href={`/wiki/${owner}/${repo}/${tocPage.slug}${version ? `?version=${version}` : ''}`}
                    className={`block text-sm py-2 px-4 rounded-lg hover:bg-primary/10 transition-all duration-200 ${
                      tocPage.slug === slug
                        ? 'bg-primary/10 font-semibold text-primary border-l-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tocPage.title}
                  </Link>
                ))}
              </nav>

              {/* Quick Links */}
              <div className="pt-6 border-t">
                <Link
                  href={`https://github.com/${owner}/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <GitBranch className="h-4 w-4" />
                  View on GitHub
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="max-w-4xl mx-auto w-full">
            {/* Page Title */}
            <div className="mb-10 pb-8 border-b">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {page.title}
              </h1>
              {page.summary && (
                <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  {page.summary}
                </p>
              )}
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Updated {new Date(page.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Markdown Content */}
            <article className="prose prose-lg prose-neutral dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:leading-relaxed prose-p:text-base
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
              prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-muted prose-pre:border prose-pre:shadow-lg
              prose-ul:my-6 prose-li:my-2
              prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1
              prose-img:rounded-lg prose-img:shadow-md">
              <ReactMarkdown
                components={{
                  code(props) {
                    const { inline, className, children, ...rest } = props as {
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                    };
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          borderRadius: '0.5rem',
                          padding: '1.5rem',
                          fontSize: '0.875rem',
                        }}
                        {...rest}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {page.content}
              </ReactMarkdown>
            </article>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                <p className="text-muted-foreground">
                  Auto-generated by{' '}
                  <Link href="/" className="font-semibold text-primary hover:underline">
                    gh.gg
                  </Link>
                </p>
                <Link
                  href={`https://github.com/${owner}/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  View repository on GitHub
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
