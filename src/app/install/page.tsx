'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';
import { ChevronDown, Eye, GitPullRequest, Lock, Github, Check, Settings } from 'lucide-react';

const APP_NAME = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg';

function buildInstallUrl(returnPath?: string | null) {
  const base = `https://github.com/apps/${APP_NAME}/installations/new`;
  return returnPath ? `${base}?state=${encodeURIComponent(returnPath)}` : base;
}

function InstallContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoading: authLoading, signIn } = useAuth();
  const [showPermissions, setShowPermissions] = useState(false);

  const returnTo = useMemo(() => {
    const raw = searchParams.get('state') || searchParams.get('returnTo');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return null;
  }, [searchParams]);

  const installUrl = buildInstallUrl(returnTo);

  const installationQuery = trpc.webhooks.getInstallationInfo.useQuery(undefined, {
    enabled: isSignedIn,
  });

  if (authLoading) {
    return <Skeleton />;
  }

  if (!isSignedIn) {
    return (
      <Layout>
        <Hero
          title="Sign in to connect GitHub"
          subtitle={
            returnTo
              ? `Sign in to unlock ${returnTo} and analyze your private repositories.`
              : 'Sign in with GitHub to connect your account and analyze private repositories.'
          }
        />
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => signIn(returnTo || '/install')} className="text-base px-6 py-6">
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
        </div>
      </Layout>
    );
  }

  const installed = !!installationQuery.data;
  const manageUrl = installed && installationQuery.data
    ? `https://github.com/settings/installations/${installationQuery.data.installationId}`
    : null;

  if (installed && installationQuery.data) {
    return (
      <Layout>
        <Hero
          title="GitHub is connected"
          subtitle={`github.gg has access to repos on ${installationQuery.data.accountLogin || 'your account'}.`}
        />

        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 shrink-0" />
          <div className="text-sm text-green-900">
            Connection active. You can access your private repos now.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {returnTo ? (
            <Link href={returnTo}>
              <Button size="lg">Continue to {returnTo}</Button>
            </Link>
          ) : (
            <Link href="/">
              <Button size="lg">Go to dashboard</Button>
            </Link>
          )}
          {manageUrl && (
            <a href={manageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg">
                <Settings className="mr-2 h-4 w-4" />
                Manage repositories on GitHub
              </Button>
            </a>
          )}
        </div>
      </Layout>
    );
  }

  // Signed in, not installed
  return (
    <Layout>
      <Hero
        title="Connect your GitHub account"
        subtitle={
          returnTo
            ? `Connect GitHub to unlock ${returnTo} and any other private repos you want analyzed.`
            : 'Connect GitHub to analyze your private repos, generate developer insights, and enable automated PR reviews.'
        }
      />

      <div className="mt-8 space-y-3">
        <ValueProp
          icon={<Lock className="h-5 w-5 text-blue-600" />}
          title="Read-only code access"
          body="We read your code to generate analysis. We never store source code."
        />
        <ValueProp
          icon={<Eye className="h-5 w-5 text-purple-600" />}
          title="Private repo insights"
          body="Scorecards, AI wikis, Developer Arena rankings — unlocked for your private repos."
        />
        <ValueProp
          icon={<GitPullRequest className="h-5 w-5 text-green-600" />}
          title="Automated PR reviews"
          body="Optional: post AI code reviews as comments on your pull requests."
        />
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-900 leading-relaxed">
          <span className="font-semibold">Tip:</span> On the next screen, GitHub will default to <em>All repositories</em>. You can choose <span className="font-semibold">Only select repositories</span> and pick just the repos you want analyzed.
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <a href={installUrl} className="w-full max-w-sm">
          <Button size="lg" className="w-full text-base py-6">
            <Github className="mr-2 h-5 w-5" />
            Connect GitHub Account
          </Button>
        </a>
        <p className="text-xs text-gray-500">You&apos;ll be taken to GitHub to finish connecting.</p>
      </div>

      <Collapsible open={showPermissions} onOpenChange={setShowPermissions} className="mt-8">
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mx-auto">
          <ChevronDown
            className="h-3 w-3 transition-transform"
            style={{ transform: showPermissions ? 'rotate(180deg)' : undefined }}
          />
          {showPermissions ? 'Hide' : 'View'} technical permissions
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-3">
            <div>
              <div className="font-semibold text-gray-700 mb-2">Repository permissions</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">Contents: Read-only</Badge>
                <Badge variant="secondary">Metadata: Read-only</Badge>
                <Badge variant="secondary">Pull requests: Read &amp; write</Badge>
                <Badge variant="secondary">Issues: Read &amp; write</Badge>
                <Badge variant="secondary">Commit statuses: Read &amp; write</Badge>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">Subscribed events</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">Push</Badge>
                <Badge variant="outline">Pull request</Badge>
                <Badge variant="outline">Installation</Badge>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 pt-1">
              Read &amp; write on PRs and issues is required to post AI review comments. You can disable PR reviews later in Settings.
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-xl">{children}</div>
    </div>
  );
}

function Hero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{title}</h1>
      <p className="text-base text-gray-600 max-w-lg mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
}

function ValueProp({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 p-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-medium text-gray-900 text-sm">{title}</div>
        <div className="text-sm text-gray-600 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-12 bg-gray-200 rounded mt-8" />
        </div>
      </div>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <InstallContent />
    </Suspense>
  );
}
