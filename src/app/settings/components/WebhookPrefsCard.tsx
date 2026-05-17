'use client';

import { Webhook } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CardWithHeader } from '@/components/common';
import { TextLink } from '@/components/ui/text-link';
import { buildGitHubAppInstallUrl } from '@/lib/github/install-url';

export interface WebhookInstallationInfo {
  accountLogin: string;
}

export interface WebhookPreferences {
  prReviewEnabled?: boolean;
  autoUpdateEnabled?: boolean;
}

interface WebhookPrefsCardProps {
  installationInfo: WebhookInstallationInfo | null | undefined;
  webhookPrefs: WebhookPreferences | null | undefined;
  isUpdating: boolean;
  onUpdate: (prefs: Partial<WebhookPreferences>) => void;
}

export function WebhookPrefsCard({
  installationInfo,
  webhookPrefs,
  isUpdating,
  onUpdate,
}: WebhookPrefsCardProps) {
  return (
    <CardWithHeader
      title="PR Reviews"
      description="Automated code reviews on pull requests."
      icon={Webhook}
    >
      <div className="space-y-4">
        {!installationInfo ? (
          <div className="py-2">
            <p className="text-sm text-[#999] mb-3">
              GitHub App not installed.
            </p>
            <TextLink href={buildGitHubAppInstallUrl('/settings')} external active>
              Install GitHub App
            </TextLink>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm text-green-800">
                  ✓ GitHub App installed for <strong>{installationInfo.accountLogin}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pr-review-enabled">Enable PR Reviews</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically post AI-powered code reviews on pull requests
                </p>
              </div>
              <Switch
                id="pr-review-enabled"
                checked={webhookPrefs?.prReviewEnabled ?? true}
                onCheckedChange={(checked) => {
                  onUpdate({ prReviewEnabled: checked });
                }}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-update-enabled">Auto-update Comments</Label>
                <p className="text-sm text-muted-foreground">
                  Update review comment when PR is updated
                </p>
              </div>
              <Switch
                id="auto-update-enabled"
                checked={webhookPrefs?.autoUpdateEnabled ?? true}
                onCheckedChange={(checked) => {
                  onUpdate({ autoUpdateEnabled: checked });
                }}
                disabled={isUpdating || !webhookPrefs?.prReviewEnabled}
              />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> PR reviews analyze code quality, security, performance, and maintainability. Comments include actionable recommendations for improvements.
              </p>
            </div>
          </div>
        )}
      </div>
    </CardWithHeader>
  );
}
