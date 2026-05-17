'use client';

import {
  Star,
  Users,
  AlertTriangle,
  Bot,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IntelRepo } from './intel-data';

interface OverviewTabProps {
  selectedRepos: IntelRepo[];
  totalStars: number;
  totalBots: number;
  avgQuality: number;
}

export function OverviewTab({ selectedRepos, totalStars, totalBots, avgQuality }: OverviewTabProps) {
  return (
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
  );
}
