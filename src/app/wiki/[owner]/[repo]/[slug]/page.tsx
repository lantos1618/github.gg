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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/wiki/${owner}/${repo}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Wiki
              </Link>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Link
                  href={`/${owner}/${repo}`}
                  className="text-sm font-medium hover:underline"
                >
                  {owner}/{repo}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {page.viewCount}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                v{page.version}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
          {/* Table of Contents Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Contents
              </h2>
              <nav className="space-y-2">
                {toc.pages.map((tocPage) => (
                  <Link
                    key={tocPage.slug}
                    href={`/wiki/${owner}/${repo}/${tocPage.slug}${version ? `?version=${version}` : ''}`}
                    className={`block text-sm py-1 px-2 rounded hover:bg-muted transition-colors ${
                      tocPage.slug === slug
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {tocPage.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="max-w-4xl">
            {/* Page Title */}
            <div className="mb-8 pb-4 border-b">
              <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
              {page.summary && (
                <p className="text-lg text-muted-foreground">{page.summary}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Last updated: {new Date(page.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Markdown Content */}
            <article className="prose prose-neutral dark:prose-invert max-w-none">
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
            <footer className="mt-12 pt-8 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  Documentation auto-generated by{' '}
                  <Link href="/" className="font-medium hover:underline">
                    gh.gg
                  </Link>
                </p>
                <Link
                  href={`https://github.com/${owner}/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View on GitHub →
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
