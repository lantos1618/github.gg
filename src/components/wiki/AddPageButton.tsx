'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AddPageButtonProps {
  owner: string;
  repo: string;
}

export function AddPageButton({ owner, repo }: AddPageButtonProps) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/wiki/${owner}/${repo}/new`}>
        <Plus className="h-4 w-4 mr-2" />
        New Page
      </Link>
    </Button>
  );
}
