'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Key, Trash2, BarChart3, Webhook, Palette, Plus, Copy, Check, Code2, ExternalLink } from 'lucide-react';
import { PageHeader, CardWithHeader } from '@/components/common';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Add this simple debounce hook if not already available
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Public API Keys state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  
  // tRPC queries and mutations
  const { data: keyStatus } = trpc.user.getApiKeyStatus.useQuery();
  const { data: usageStats } = trpc.user.getUsageStats.useQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // This month
  });
  const { data: currentPlan } = trpc.user.getCurrentPlan.useQuery();
  const { data: webhookPrefs, refetch: refetchWebhookPrefs } = trpc.webhooks.getPreferences.useQuery();
  const { data: installationInfo } = trpc.webhooks.getInstallationInfo.useQuery();

  // Public API Keys
  const { data: publicApiKeys, refetch: refetchApiKeys } = trpc.apiKeys.list.useQuery();
  const createApiKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewKeyRevealed(data.key);
      setNewKeyName('');
      refetchApiKeys();
      toast.success('API key created! Copy it now - it won\'t be shown again.');
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });
  const deleteApiKey_public = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success('API key deleted');
      refetchApiKeys();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Profile Customization State
  const { data: currentUser } = trpc.me.useQuery();
  const { data: profileStyles, isLoading: stylesLoading } = trpc.user.getProfileStyles.useQuery(
    { username: currentUser?.user?.githubUsername || '' },
    { enabled: !!currentUser?.user?.githubUsername }
  );

  const [localStyles, setLocalStyles] = useState<Record<string, string | boolean | undefined>>({});
  
  useEffect(() => {
    if (profileStyles) {
      setLocalStyles(profileStyles);
    }
  }, [profileStyles]);

  const updateStylesMutation = trpc.user.updateProfileStyles.useMutation({
    onSuccess: () => {
      // toast.success('Profile styles updated!'); // Silent update for smoother UX
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const debouncedStyles = useDebounce(localStyles, 1000);

  useEffect(() => {
    if (Object.keys(debouncedStyles).length > 0 && JSON.stringify(debouncedStyles) !== JSON.stringify(profileStyles)) {
      updateStylesMutation.mutate({ styles: debouncedStyles });
    }
  }, [debouncedStyles]);

  const handleStyleChange = (key: string, value: string | boolean) => {
    setLocalStyles((prev) => ({ ...prev, [key]: value }));
  };

  const saveApiKey = trpc.user.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success('API Key saved successfully!');
      setApiKey('');
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });


  const deleteApiKey = trpc.user.deleteApiKey.useMutation({
    onSuccess: () => {
      toast.success('API Key deleted successfully!');
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const getBillingPortal = trpc.billing.getBillingPortal.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const updateWebhookPrefs = trpc.webhooks.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success('Webhook settings updated!');
      refetchWebhookPrefs();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }
    saveApiKey.mutate({ apiKey: apiKey.trim() });
  };

  const handleDeleteKey = () => {
    if (confirm('Are you sure you want to delete your API key? This action cannot be undone.')) {
      deleteApiKey.mutate();
    }
  };

  const handleManageBilling = () => {
    if (currentPlan?.plan === 'free') {
      toast.error('You need an active subscription to manage billing');
      return;
    }
    getBillingPortal.mutate();
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }
    createApiKey.mutate({ name: newKeyName.trim(), scopes: ['read'] });
  };

  const handleCopyKey = async (key: string, id?: string) => {
    await navigator.clipboard.writeText(key);
    if (id) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
    toast.success('Copied to clipboard');
  };

  const handleDeletePublicKey = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      deleteApiKey_public.mutate({ id });
    }
  };

  return (
    <div className="container py-8 max-w-4xl px-4 md:px-8">
      <PageHeader title="Settings" description="Manage your account settings and preferences" />

      <div className="grid gap-8">
        {/* Profile Customization */}
        <CardWithHeader
          title="Profile Customization"
          description="Personalize your developer profile with custom colors and effects."
          icon={Palette}
        >
          {currentPlan?.plan === 'pro' || currentPlan?.plan === 'byok' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-10 h-10 rounded border cursor-pointer shadow-sm" 
                      style={{ backgroundColor: (localStyles.primaryColor as string) || '#000000' }}
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="w-full h-full" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                          <HexColorPicker 
                            color={(localStyles.primaryColor as string) || '#000000'} 
                            onChange={(color) => handleStyleChange('primaryColor', color)} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input 
                      value={(localStyles.primaryColor as string) || ''} 
                      placeholder="#000000" 
                      onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                   <div className="flex gap-2 items-center">
                    <div 
                      className="w-10 h-10 rounded border cursor-pointer shadow-sm" 
                      style={{ backgroundColor: (localStyles.textColor as string) || '#000000' }}
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="w-full h-full" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                          <HexColorPicker 
                            color={(localStyles.textColor as string) || '#000000'} 
                            onChange={(color) => handleStyleChange('textColor', color)} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input 
                      value={(localStyles.textColor as string) || ''} 
                      placeholder="#000000" 
                      onChange={(e) => handleStyleChange('textColor', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Background Color</Label>
                   <div className="flex gap-2 items-center">
                    <div 
                      className="w-10 h-10 rounded border cursor-pointer shadow-sm" 
                      style={{ backgroundColor: (localStyles.backgroundColor as string) || '#ffffff' }}
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="w-full h-full" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                          <HexColorPicker 
                            color={(localStyles.backgroundColor as string) || '#ffffff'} 
                            onChange={(color) => handleStyleChange('backgroundColor', color)} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input 
                      value={(localStyles.backgroundColor as string) || ''} 
                      placeholder="#ffffff" 
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sparkle Emoji</Label>
                  <Input 
                    value={(localStyles.emoji as string) || ''} 
                    placeholder="✨" 
                    maxLength={2}
                    onChange={(e) => handleStyleChange('emoji', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Emoji to use for sparkle effects</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="sparkles-enabled">Enable Sparkle Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Show floating animations on your profile
                  </p>
                </div>
                <Switch
                  id="sparkles-enabled"
                  checked={(localStyles.sparkles as boolean) ?? false}
                  onCheckedChange={(checked) => handleStyleChange('sparkles', checked)}
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg text-center space-y-4">
              <Palette className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Unlock Profile Customization</h3>
                <p className="text-muted-foreground max-w-md mx-auto mt-2">
                  Upgrade to Pro to customize your profile colors, add sparkle effects, and make your developer identity truly yours.
                </p>
              </div>
              <Button onClick={handleManageBilling} variant="default">
                Upgrade to Customize
              </Button>
            </div>
          )}
        </CardWithHeader>

        {/* Current Plan */}
        <CardWithHeader
          title="Your Plan"
          description="Manage your subscription and billing."
          icon={Key}
        >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold capitalize">
                  {currentPlan?.plan || 'Free'} Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentPlan?.plan === 'free' && 'Public repositories only'}
                  {currentPlan?.plan === 'byok' && 'Private repos + BYOK'}
                  {currentPlan?.plan === 'pro' && 'Private repos + managed AI'}
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={handleManageBilling}
                disabled={getBillingPortal.isPending}
              >
                {getBillingPortal.isPending ? 'Loading...' : 'Manage Billing'}
              </Button>
            </div>
        </CardWithHeader>

        {/* API Key Management */}
        <CardWithHeader
          title="Bring Your Own Key (BYOK)"
          description="Add your own Google Gemini API key for unlimited usage."
          icon={Key}
        >
          <div className="space-y-4">
            {keyStatus?.hasKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Key className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">API key is configured</span>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteKey}
                  disabled={deleteApiKey.isPending}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteApiKey.isPending ? 'Deleting...' : 'Delete Key'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      type={showKey ? 'text' : 'password'} 
                      placeholder="Your API key..." 
                      value={apiKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSaveKey} 
                    disabled={saveApiKey.isPending || !apiKey.trim()}
                  >
                    {saveApiKey.isPending ? 'Saving...' : 'Save Key'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your key is encrypted and stored securely. We never log or view your key.
                </p>
              </div>
            )}
          </div>
        </CardWithHeader>

        {/* Public API Keys */}
        <CardWithHeader
          title="API Keys"
          description="Manage API keys for programmatic access to the GG REST API."
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
                    onClick={() => handleCopyKey(newKeyRevealed)}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewKeyRevealed(null)}
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
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateApiKey()}
                className="flex-1"
              />
              <Button
                onClick={handleCreateApiKey}
                disabled={createApiKey.isPending || !newKeyName.trim()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {createApiKey.isPending ? 'Creating...' : 'Create Key'}
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
                          onClick={() => handleCopyKey(key.keyPrefix + '...', key.id)}
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
                          onClick={() => handleDeletePublicKey(key.id, key.name)}
                          disabled={deleteApiKey_public.isPending}
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
              <a
                href="/api-docs"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                View API Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardWithHeader>

        {/* Usage Statistics */}
        <CardWithHeader
          title="Usage Statistics"
          description="Your token usage for this month."
          icon={BarChart3}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {usageStats?.totalTokens?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-blue-800">Total Tokens</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {usageStats?.byokTokens?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-green-800">BYOK Tokens</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {usageStats?.managedTokens?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-purple-800">Managed Tokens</div>
              </div>
            </div>
            
            {usageStats?.usage && usageStats.usage.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Recent Usage</h4>
                <div className="space-y-2">
                  {usageStats.usage.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="capitalize">{entry.feature}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {entry.totalTokens.toLocaleString()} tokens
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          entry.isByok 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.isByok ? 'BYOK' : 'Managed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </CardWithHeader>

        {/* Webhook Settings */}
        <CardWithHeader
          title="PR Review Automation"
          description="Configure automated pull request reviews for your repositories."
          icon={Webhook}
        >
          <div className="space-y-4">
            {!installationInfo ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-3">
                  GitHub App not installed. Install the gh.gg app to enable PR reviews.
                </p>
                <Button variant="outline" asChild>
                  <a href="/install" target="_blank" rel="noopener noreferrer">
                    Install GitHub App
                  </a>
                </Button>
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
                      updateWebhookPrefs.mutate({ prReviewEnabled: checked });
                    }}
                    disabled={updateWebhookPrefs.isPending}
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
                      updateWebhookPrefs.mutate({ autoUpdateEnabled: checked });
                    }}
                    disabled={updateWebhookPrefs.isPending || !webhookPrefs?.prReviewEnabled}
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
      </div>
    </div>
  );
} 