'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { usePlan } from '@/lib/hooks/usePlan';
import { toast } from 'sonner';
import { Key, BarChart3 } from 'lucide-react';
import { PageHeader, CardWithHeader } from '@/components/common';
import { TextButton } from '@/components/ui/text-button';
import { TextLink } from '@/components/ui/text-link';
import { APIKeyCard } from './components/APIKeyCard';
import { PublicAPIKeysCard } from './components/PublicAPIKeysCard';
import { ProfileCustomizationCard } from './components/ProfileCustomizationCard';
import { WebhookPrefsCard } from './components/WebhookPrefsCard';

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

export interface SettingsInitialData {
  plan: string | null;
  isPaid: boolean;
  keyStatus: { hasKey: boolean } | null;
  profileStyles: Record<string, string | boolean | undefined> | null;
  username: string | null;
}

export default function SettingsClient({ initialData }: { initialData: SettingsInitialData }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Public API Keys state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // tRPC queries — seeded with server data so no flash
  const { data: keyStatus } = trpc.user.getApiKeyStatus.useQuery(undefined, {
    initialData: initialData.keyStatus ?? undefined,
    staleTime: 60_000,
  });
  const { data: usageStats } = trpc.user.getUsageStats.useQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  });
  const { plan: clientPlan, isPaid: clientIsPaid } = usePlan();
  const plan = clientPlan ?? initialData.plan;
  const isPaid = clientIsPaid || initialData.isPaid;
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
  const username = currentUser?.user?.githubUsername || initialData.username || '';
  const { data: profileStyles } = trpc.user.getProfileStyles.useQuery(
    { username },
    {
      enabled: !!username,
      initialData: initialData.profileStyles ?? undefined,
      staleTime: 60_000,
    }
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
    // Only auto-save if styles have real values (not from a reset) and differ from server
    const hasRealValues = Object.values(debouncedStyles).some(v => v !== undefined && v !== '');
    if (hasRealValues && Object.keys(debouncedStyles).length > 0 && JSON.stringify(debouncedStyles) !== JSON.stringify(profileStyles)) {
      updateStylesMutation.mutate({ styles: debouncedStyles });
    }
  }, [debouncedStyles]);

  const handleStyleChange = (key: string, value: string | boolean) => {
    setLocalStyles((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetStyles = () => {
    const defaults = { primaryColor: undefined, textColor: undefined, backgroundColor: undefined, emoji: undefined, sparkles: false };
    setLocalStyles(defaults);
    updateStylesMutation.mutate({ styles: {} }, {
      onSuccess: () => toast.success('Profile styles reset'),
    });
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
    if (!isPaid) {
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
      <PageHeader title="Settings" />

      <div className="grid gap-8">
        {/* Profile Customization */}
        <ProfileCustomizationCard
          isPaid={isPaid}
          localStyles={localStyles}
          onStyleChange={handleStyleChange}
          onReset={handleResetStyles}
        />

        {/* Current Plan */}
        <CardWithHeader
          title="Plan"
          description={`${(plan || 'free').charAt(0).toUpperCase() + (plan || 'free').slice(1)} — ${(!plan || plan === 'free') ? 'Public repositories' : plan === 'byok' ? 'Private repos + BYOK' : 'Private repos + managed AI'}`}
          icon={Key}
          action={isPaid ? (
            <TextButton
              onClick={handleManageBilling}
              disabled={getBillingPortal.isPending}
            >
              {getBillingPortal.isPending ? 'Loading...' : 'Manage Billing'}
            </TextButton>
          ) : (
            <TextLink href="/pricing">
              Upgrade
            </TextLink>
          )}
        >
          <div />
        </CardWithHeader>

        {/* API Key Management */}
        <APIKeyCard
          hasKey={!!keyStatus?.hasKey}
          apiKey={apiKey}
          showKey={showKey}
          isSaving={saveApiKey.isPending}
          isDeleting={deleteApiKey.isPending}
          onApiKeyChange={setApiKey}
          onToggleVisibility={() => setShowKey(!showKey)}
          onSave={handleSaveKey}
          onDelete={handleDeleteKey}
        />

        {/* Public API Keys */}
        <PublicAPIKeysCard
          publicApiKeys={publicApiKeys}
          newKeyName={newKeyName}
          newKeyRevealed={newKeyRevealed}
          copiedKeyId={copiedKeyId}
          isCreating={createApiKey.isPending}
          isDeleting={deleteApiKey_public.isPending}
          onNewKeyNameChange={setNewKeyName}
          onCreate={handleCreateApiKey}
          onCopy={handleCopyKey}
          onDelete={handleDeletePublicKey}
          onDismissRevealed={() => setNewKeyRevealed(null)}
        />

        {/* Usage Statistics */}
        <CardWithHeader
          title="Usage"
          description="Token usage this month."
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
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-[#111]">
                  {usageStats?.managedTokens?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-700">Managed Tokens</div>
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
        <WebhookPrefsCard
          installationInfo={installationInfo}
          webhookPrefs={webhookPrefs}
          isUpdating={updateWebhookPrefs.isPending}
          onUpdate={(prefs) => updateWebhookPrefs.mutate(prefs)}
        />
      </div>
    </div>
  );
}
