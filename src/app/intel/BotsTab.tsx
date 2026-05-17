'use client';

import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_BOTS } from './intel-data';

export function BotsTab() {
  return (
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
  );
}
