'use client';

import { useState, useMemo } from 'react';
import {
  Star,
  Users,
  AlertTriangle,
  Bot,
  Shield,
  Search,
  Download,
  Filter,
  MapPin,
  Activity,
  GitFork,
  Target,
  Mail,
  Building2,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Github,
  Plus,
  X,
  Network,
  TrendingUp,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextButton } from '@/components/ui/text-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock data for multiple repos
const MOCK_REPOS = [
  {
    id: 1,
    owner: 'vercel',
    name: 'next.js',
    stars: 124532,
    forks: 26847,
    qualityScore: 94,
    realStars: 121847,
    suspiciousStars: 2134,
    likelyBots: 551,
    color: '#0070f3',
  },
  {
    id: 2,
    owner: 'facebook',
    name: 'react',
    stars: 218432,
    forks: 44521,
    qualityScore: 97,
    realStars: 215102,
    suspiciousStars: 2830,
    likelyBots: 500,
    color: '#61dafb',
  },
  {
    id: 3,
    owner: 'sveltejs',
    name: 'svelte',
    stars: 78234,
    forks: 4123,
    qualityScore: 91,
    realStars: 75890,
    suspiciousStars: 1844,
    likelyBots: 500,
    color: '#ff3e00',
  },
];

// Mock network data - shared stargazers between repos
const MOCK_NETWORK = {
  sharedStargazers: [
    { repos: ['next.js', 'react'], count: 45230, pct: 36 },
    { repos: ['next.js', 'svelte'], count: 12450, pct: 10 },
    { repos: ['react', 'svelte'], count: 28340, pct: 13 },
    { repos: ['next.js', 'react', 'svelte'], count: 8920, pct: 7 },
  ],
  botNetworks: [
    { name: 'star-farm-cn-01', affectedRepos: ['next.js', 'react'], accountCount: 234, detected: '2d ago' },
    { name: 'boost-network-42', affectedRepos: ['svelte'], accountCount: 89, detected: '1w ago' },
  ],
  topCrossRepoUsers: [
    { username: 'dan_abramov', repos: 3, stars: 3, prs: 12, comments: 156, influence: 98 },
    { username: 'sindresorhus', repos: 3, stars: 3, prs: 5, comments: 23, influence: 95 },
    { username: 'kentcdodds', repos: 3, stars: 3, prs: 8, comments: 89, influence: 94 },
    { username: 'tannerlinsley', repos: 2, stars: 2, prs: 3, comments: 45, influence: 88 },
  ],
};

const MOCK_USERS = [
  { username: 'sarah-chen', name: 'Sarah Chen', avatar: 'https://avatars.githubusercontent.com/u/1?v=4', company: 'Stripe', role: 'Staff Engineer', location: 'San Francisco, CA', email: 'sarah@...', score: 94, starred: '3d ago', comments: 2, prs: 1, followers: 2341 },
  { username: 'mike-dev', name: 'Mike Johnson', avatar: 'https://avatars.githubusercontent.com/u/2?v=4', company: 'Google', role: 'Senior Developer', location: 'Seattle, WA', email: 'mike@...', score: 87, starred: '1w ago', comments: 5, prs: 0, followers: 892 },
  { username: 'alex_kumar', name: 'Alex Kumar', avatar: 'https://avatars.githubusercontent.com/u/3?v=4', company: 'Meta', role: 'Tech Lead', location: 'New York, NY', email: 'alex@...', score: 82, starred: '2w ago', comments: 1, prs: 2, followers: 1567 },
  { username: 'jennifer-w', name: 'Jennifer Wang', avatar: 'https://avatars.githubusercontent.com/u/5?v=4', company: 'Netflix', role: 'Engineering Manager', location: 'Los Angeles, CA', email: 'jen@...', score: 91, starred: '5d ago', comments: 3, prs: 1, followers: 3421 },
];

const MOCK_BOTS = [
  { username: 'user8847213', accountAge: '3 days', botProb: 0.87 },
  { username: 'bot_user_8823', accountAge: '2 days', botProb: 0.95 },
  { username: 'xyz123abc456', accountAge: '5 days', botProb: 0.91 },
  { username: 'star_machine_42', accountAge: '1 day', botProb: 0.98 },
];

type ViewType = 'overview' | 'network' | 'bots' | 'gtm';

export default function IntelPage() {
  const [repoInput, setRepoInput] = useState('');
  const [selectedRepos, setSelectedRepos] = useState(MOCK_REPOS);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const addRepo = () => {
    if (repoInput.trim()) {
      // Mock adding a repo
      setRepoInput('');
    }
  };

  const removeRepo = (id: number) => {
    setSelectedRepos(repos => repos.filter(r => r.id !== id));
  };

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter(user => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return user.username.toLowerCase().includes(q) || user.name.toLowerCase().includes(q) || user.company.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery]);

  const totalStars = selectedRepos.reduce((sum, r) => sum + r.stars, 0);
  const totalBots = selectedRepos.reduce((sum, r) => sum + r.likelyBots, 0);
  const avgQuality = Math.round(selectedRepos.reduce((sum, r) => sum + r.qualityScore, 0) / selectedRepos.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-gray-900" />
                <h1 className="text-xl font-semibold text-gray-900">Repository Intelligence</h1>
                <Badge variant="outline" className="text-xs">Preview</Badge>
              </div>
              <p className="text-sm text-gray-500">
                Cross-repo star analysis, bot detection, and GTM discovery
              </p>
            </div>
          </div>

          {/* Repo Input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Add repository (owner/repo)"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRepo()}
                className="pl-10"
                aria-label="Add repository"
              />
            </div>
            <TextButton onClick={addRepo} className="inline-flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add
            </TextButton>
          </div>

          {/* Selected Repos */}
          <div className="flex flex-wrap gap-2">
            {selectedRepos.map(repo => (
              <div
                key={repo.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: repo.color }}
                />
                <span className="font-medium text-gray-700">{repo.owner}/{repo.name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{(repo.stars / 1000).toFixed(0)}k</span>
                <button
                  onClick={() => removeRepo(repo.id)}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'network', label: 'Network Analysis', icon: Network },
              { id: 'bots', label: 'Bot Detection', icon: Bot },
              { id: 'gtm', label: 'GTM Discovery', icon: Target },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewType)}
                className={cn(
                  'flex items-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeView === item.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Star className="h-4 w-4" />
                    Total Stars
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{totalStars.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Shield className="h-4 w-4" />
                    Avg Quality
                  </div>
                  <div className={cn('text-2xl font-bold', avgQuality >= 90 ? 'text-green-600' : avgQuality >= 70 ? 'text-orange-600' : 'text-red-600')}>
                    {avgQuality}/100
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Bot className="h-4 w-4" />
                    Detected Bots
                  </div>
                  <div className="text-2xl font-bold text-red-600">{totalBots.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Users className="h-4 w-4" />
                    Repos Analyzed
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{selectedRepos.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Per-Repo Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repository Breakdown</CardTitle>
                <CardDescription>Star quality analysis per repository</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedRepos.map(repo => (
                    <div key={repo.id} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-40">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: repo.color }} />
                        <span className="font-medium text-gray-900 truncate">{repo.name}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(repo.realStars / repo.stars) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-12">{((repo.realStars / repo.stars) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{repo.stars.toLocaleString()} total</span>
                          <span className="text-green-600">{repo.realStars.toLocaleString()} real</span>
                          <span className="text-orange-600">{repo.suspiciousStars.toLocaleString()} suspicious</span>
                          <span className="text-red-600">{repo.likelyBots.toLocaleString()} bots</span>
                        </div>
                      </div>
                      <Badge className={cn(
                        repo.qualityScore >= 90 ? 'bg-green-100 text-green-700' :
                        repo.qualityScore >= 70 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {repo.qualityScore}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700">142 stars from accounts &lt; 7 days old detected on <strong>next.js</strong></p>
                    <p className="text-xs text-gray-500 mt-0.5">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700">No bot network activity detected across selected repos</p>
                    <p className="text-xs text-gray-500 mt-0.5">1 day ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Network Analysis */}
        {activeView === 'network' && (
          <div className="space-y-6">
            {/* Network Visualization Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cross-Repository Network</CardTitle>
                <CardDescription>Visualize shared stargazers and contributor overlap</CardDescription>
              </CardHeader>
              <CardContent>
                {/* SVG Network Graph */}
                <div className="relative h-80 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    {/* Connection lines */}
                    <line x1="100" y1="150" x2="200" y2="80" stroke="#e5e7eb" strokeWidth="8" />
                    <line x1="100" y1="150" x2="300" y2="150" stroke="#e5e7eb" strokeWidth="4" />
                    <line x1="200" y1="80" x2="300" y2="150" stroke="#e5e7eb" strokeWidth="6" />

                    {/* Repo nodes */}
                    <g className="cursor-pointer">
                      <circle cx="100" cy="150" r="35" fill="#0070f3" />
                      <text x="100" y="155" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">next.js</text>
                      <text x="100" y="200" textAnchor="middle" fill="#6b7280" fontSize="10">124k ★</text>
                    </g>
                    <g className="cursor-pointer">
                      <circle cx="200" cy="80" r="45" fill="#61dafb" />
                      <text x="200" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">react</text>
                      <text x="200" y="140" textAnchor="middle" fill="#6b7280" fontSize="10">218k ★</text>
                    </g>
                    <g className="cursor-pointer">
                      <circle cx="300" cy="150" r="30" fill="#ff3e00" />
                      <text x="300" y="155" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">svelte</text>
                      <text x="300" y="195" textAnchor="middle" fill="#6b7280" fontSize="10">78k ★</text>
                    </g>

                    {/* Overlap labels */}
                    <text x="145" y="105" fill="#374151" fontSize="9" fontWeight="500">45k shared</text>
                    <text x="250" y="105" fill="#374151" fontSize="9" fontWeight="500">28k</text>
                    <text x="200" y="165" fill="#374151" fontSize="9" fontWeight="500">12k</text>
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Shared Stargazers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stargazer Overlap</CardTitle>
                <CardDescription>Users who starred multiple selected repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_NETWORK.sharedStargazers.map((overlap, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex gap-1 w-48">
                        {overlap.repos.map(repo => (
                          <Badge key={repo} variant="secondary" className="text-xs">{repo}</Badge>
                        ))}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overlap.pct}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-24 text-right">{overlap.count.toLocaleString()} users</span>
                      <span className="text-sm text-gray-500 w-12">{overlap.pct}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cross-Repo Influencers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cross-Repository Influencers</CardTitle>
                <CardDescription>Most engaged users across your selected repos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-gray-500">User</th>
                        <th className="pb-3 font-medium text-gray-500">Repos</th>
                        <th className="pb-3 font-medium text-gray-500">PRs</th>
                        <th className="pb-3 font-medium text-gray-500">Comments</th>
                        <th className="pb-3 font-medium text-gray-500 text-right">Influence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {MOCK_NETWORK.topCrossRepoUsers.map(user => (
                        <tr key={user.username} className="hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">@{user.username}</td>
                          <td className="py-3 text-gray-600">{user.repos}/{selectedRepos.length}</td>
                          <td className="py-3 text-gray-600">{user.prs}</td>
                          <td className="py-3 text-gray-600">{user.comments}</td>
                          <td className="py-3 text-right">
                            <Badge className="bg-blue-100 text-blue-700">{user.influence}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Detected Bot Networks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Detected Bot Networks
                </CardTitle>
                <CardDescription>Coordinated fake star activity across repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_NETWORK.botNetworks.map((network, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div>
                        <div className="font-medium text-gray-900">{network.name}</div>
                        <div className="text-sm text-gray-500">
                          Affects: {network.affectedRepos.join(', ')} · {network.accountCount} accounts
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{network.detected}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bot Detection */}
        {activeView === 'bots' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Suspected Bot Accounts</CardTitle>
                <CardDescription>Accounts flagged across all selected repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-gray-500">Account</th>
                        <th className="pb-3 font-medium text-gray-500">Age</th>
                        <th className="pb-3 font-medium text-gray-500">Profile</th>
                        <th className="pb-3 font-medium text-gray-500 text-right">Bot Probability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {MOCK_BOTS.map(user => (
                        <tr key={user.username} className="hover:bg-gray-50">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <Bot className="h-4 w-4 text-gray-400" />
                              </div>
                              <span className="font-medium text-gray-900">@{user.username}</span>
                            </div>
                          </td>
                          <td className="py-3 text-red-600">{user.accountAge}</td>
                          <td className="py-3">
                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Empty</Badge>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${user.botProb * 100}%` }} />
                              </div>
                              <span className="font-mono text-red-600">{(user.botProb * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Detection Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detection Signals</CardTitle>
                <CardDescription>Patterns used to identify inauthentic activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { signal: 'Account Age < 30 days', count: 847, severity: 'high' },
                    { signal: 'Empty Profiles', count: 623, severity: 'high' },
                    { signal: 'Star-only Activity', count: 412, severity: 'medium' },
                    { signal: 'Timing Clusters', count: 89, severity: 'critical' },
                    { signal: 'No Followers', count: 534, severity: 'medium' },
                    { signal: 'Suspicious Patterns', count: 156, severity: 'high' },
                  ].map(item => (
                    <div
                      key={item.signal}
                      className={cn(
                        'p-4 rounded-lg border',
                        item.severity === 'critical' && 'bg-red-50 border-red-200',
                        item.severity === 'high' && 'bg-orange-50 border-orange-200',
                        item.severity === 'medium' && 'bg-yellow-50 border-yellow-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">{item.signal}</span>
                        <Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{item.count.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* GTM Discovery */}
        {activeView === 'gtm' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, username, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search users"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              Found <span className="font-medium text-gray-900">{filteredUsers.length}</span> high-value users across selected repos
            </p>

            <div className="space-y-3">
              {filteredUsers.map(user => (
                <Card key={user.username} className="hover:border-gray-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full bg-gray-100" />
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-gray-900">{user.name}</span>
                            <span className="text-sm text-gray-400">@{user.username}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1.5">
                            <span>{user.role}</span>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {user.company}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {user.starred}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {user.followers.toLocaleString()}
                            </span>
                            {user.comments > 0 && <span className="text-green-600">{user.comments} comments</span>}
                            {user.prs > 0 && <span className="text-blue-600">{user.prs} PRs</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={cn(
                          user.score >= 90 ? 'bg-green-100 text-green-700' :
                          user.score >= 70 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          Score: {user.score}
                        </Badge>
                        {user.email && (
                          <TextButton className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Contact
                          </TextButton>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon Footer */}
        <div className="mt-12 p-6 bg-white rounded-lg border text-center">
          <Shield className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">Intelligence Platform Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This is a preview with mock data. Full cross-repo analysis, real-time bot detection, and GTM features coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
