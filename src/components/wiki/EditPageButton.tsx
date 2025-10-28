'use client';

import { Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EditPageButtonProps {
  owner: string;
  repo: string;
  slug: string;
}

export function EditPageButton({ owner, repo, slug }: EditPageButtonProps) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/wiki/${owner}/${repo}/${slug}/edit`}>
        <Edit className="h-4 w-4" />
      </Link>
    </Button>
  );
}
