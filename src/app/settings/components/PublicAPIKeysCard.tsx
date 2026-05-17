'use client';

import Link from 'next/link';
import { Key, Trash2, Plus, Copy, Check, Code2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/common';

export interface PublicApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string | Date;
  lastUsedAt: string | Date | null;
}

interface PublicAPIKeysCardProps {
  publicApiKeys: PublicApiKey[] | undefined;
  newKeyName: string;
  newKeyRevealed: string | null;
  copiedKeyId: string | null;
  isCreating: boolean;
  isDeleting: boolean;
  onNewKeyNameChange: (value: string) => void;
  onCreate: () => void;
  onCopy: (key: string, id?: string) => void;
  onDelete: (id: string, name: string) => void;
  onDismissRevealed: () => void;
}

export function PublicAPIKeysCard({
  publicApiKeys,
  newKeyName,
  newKeyRevealed,
  copiedKeyId,
  isCreating,
  isDeleting,
  onNewKeyNameChange,
  onCreate,
  onCopy,
  onDelete,
  onDismissRevealed,
}: PublicAPIKeysCardProps) {
  return (
    <CardWithHeader
      title="API Keys"
      description="Programmatic access to the GG REST API."
      icon={Code2}
    >
      <div className="space-y-4">
        {/* Newly created key reveal */}
        {newKeyRevealed && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <Key className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-800">Your new API key</p>
                <p className="text-sm text-amber-700 mt-1">
                  Copy this key now. You won&apos;t be able to see it again!
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-white border border-amber-300 rounded text-sm font-mono break-all">
                {newKeyRevealed}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(newKeyRevealed)}
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissRevealed}
              className="text-amber-700"
            >
              I&apos;ve copied my key
            </Button>
          </div>
        )}

        {/* Create new key */}
        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g., Production App)"
            value={newKeyName}
            onChange={(e) => onNewKeyNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            className="flex-1"
          />
          <Button
            onClick={onCreate}
            disabled={isCreating || !newKeyName.trim()}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Key'}
          </Button>
        </div>

        {/* Existing keys list */}
        {publicApiKeys && publicApiKeys.length > 0 ? (
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-medium text-gray-700">Your API Keys</h4>
            <div className="divide-y border rounded-lg">
              {publicApiKeys.map((key) => (
                <div key={key.id} className="p-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{key.name}</span>
                      {!key.isActive && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
                      <span>
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      {key.lastUsedAt && (
                        <span>
                          &bull; Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCopy(key.keyPrefix + '...', key.id)}
                      title="Copy key prefix"
                    >
                      {copiedKeyId === key.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(key.id, key.name)}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No API keys yet. Create one to access the GG API programmatically.
          </p>
        )}

        {/* Link to docs */}
        <div className="pt-4 border-t">
          <Link
            href="/api-docs"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            View API Documentation
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </CardWithHeader>
  );
}
