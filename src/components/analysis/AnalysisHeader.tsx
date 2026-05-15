'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, Lock } from 'lucide-react';
import { VersionDropdown } from '@/components/VersionDropdown';
import { useAuth } from '@/lib/auth/client';

interface AnalysisHeaderProps {
  versions: any[];
  isLoadingVersions: boolean;
  selectedVersion: number | null;
  onVersionChange: (version: number | null) => void;
  onRegenerate: () => void;
  onCopyMarkdown: (markdown: string) => void;
  markdown: string | null | undefined;
  isRegenerating: boolean;
  canAccess: boolean | null | undefined;
  showCopyButton?: boolean;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  versions,
  isLoadingVersions,
  selectedVersion,
  onVersionChange,
  onRegenerate,
  onCopyMarkdown,
  markdown,
  isRegenerating,
  canAccess,
  showCopyButton = true,
}) => {
  const { isSignedIn, signIn } = useAuth();

  const handleCopy = useCallback(() => {
    if (markdown) {
      onCopyMarkdown(markdown);
    }
  }, [markdown, onCopyMarkdown]);

  const handleSignIn = useCallback(() => {
    const here = typeof window !== 'undefined' ? window.location.href : '/';
    signIn(here);
  }, [signIn]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <VersionDropdown
        versions={versions}
        isLoading={isLoadingVersions}
        selectedVersion={selectedVersion}
        onVersionChange={onVersionChange}
      />

      <div className="flex items-center gap-2">
        {showCopyButton && markdown && (
          <Button
            onClick={handleCopy}
            variant="outline"
            className="border-[#ddd] text-base hover:border-[#111]"
            title="Copy Markdown"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
        )}
        {canAccess && !isRegenerating && (
          <Button
            onClick={onRegenerate}
            className="bg-[#111] hover:bg-[#333] text-white text-base"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        )}
        {!canAccess && !isRegenerating && (
          isSignedIn ? (
            <Link href="/pricing?ref=regenerate_cta">
              <Button className="bg-[#111] hover:bg-[#333] text-white text-base">
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Upgrade to regenerate
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleSignIn}
              variant="outline"
              className="border-[#ddd] text-base hover:border-[#111]"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Sign in to regenerate
            </Button>
          )
        )}
      </div>
    </div>
  );
};
