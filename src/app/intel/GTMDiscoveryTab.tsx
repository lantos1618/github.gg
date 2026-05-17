'use client';

import {
  Star,
  Users,
  Search,
  Download,
  Filter,
  MapPin,
  Mail,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextButton } from '@/components/ui/text-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IntelUser } from './intel-data';

interface GTMDiscoveryTabProps {
  filteredUsers: IntelUser[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function GTMDiscoveryTab({ filteredUsers, searchQuery, onSearchQueryChange }: GTMDiscoveryTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, username, or company..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
  );
}
