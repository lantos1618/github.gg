'use client';

import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_NETWORK, type IntelRepo } from './intel-data';

interface NetworkTabProps {
  selectedRepos: IntelRepo[];
}

export function NetworkTab({ selectedRepos }: NetworkTabProps) {
  return (
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
  );
}
