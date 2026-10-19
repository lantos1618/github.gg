'use client';

import { Eye, EyeOff, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/common';
import { TextButton } from '@/components/ui/text-button';

interface APIKeyCardProps {
  hasKey: boolean;
  needsReentry: boolean;
  apiKey: string;
  showKey: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onApiKeyChange: (value: string) => void;
  onToggleVisibility: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function APIKeyCard({
  hasKey,
  needsReentry,
  apiKey,
  showKey,
  isSaving,
  isDeleting,
  onApiKeyChange,
  onToggleVisibility,
  onSave,
  onDelete,
}: APIKeyCardProps) {
  return (
    <CardWithHeader
      title="BYOK"
      description="Your own Gemini API key for unlimited usage."
      icon={Key}
    >
      <div className="space-y-4">
        {hasKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Key className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">API key is configured</span>
            </div>
            <TextButton
              onClick={onDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 hover:border-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Key'}
            </TextButton>
          </div>
        ) : (
          <div className="space-y-4">
            {needsReentry && (
              <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                Your saved Gemini API key can no longer be read. Enter it again to continue using BYOK features. Saving a new key replaces the old one.
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  data-testid="settings-apikey-input"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Your API key..."
                  value={apiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onApiKeyChange(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={onToggleVisibility}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                data-testid="settings-apikey-save-btn"
                onClick={onSave}
                disabled={isSaving || !apiKey.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Key'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your key is encrypted and stored securely. We never log or view your key.
            </p>
          </div>
        )}
      </div>
    </CardWithHeader>
  );
}
