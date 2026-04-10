import { Star } from 'lucide-react';
import { StarClientWrapper } from './StarClientWrapper';

interface StarCountProps {
  owner: string;
  repo: string;
  className?: string;
}

async function getStarCount(owner: string, repo: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.stargazers_count ?? null;
  } catch {
    return null;
  }
}

export async function StarCount({ owner, repo, className = '' }: StarCountProps) {
  const stars = await getStarCount(owner, repo);

  return (
    <StarClientWrapper owner={owner} repo={repo} className={className}>
      <span className="text-base font-semibold text-[#111]">
        {stars !== null ? stars.toLocaleString() : '---'}
      </span>
    </StarClientWrapper>
  );
}
