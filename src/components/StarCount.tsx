import { Star } from 'lucide-react';

interface StarCountProps {
  owner: string;
  repo: string;
  className?: string;
}

async function getStarCount(owner: string, repo: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 600 }, // cache for 10 minutes
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
    <a
      href={`https://github.com/${owner}/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="nav-star-count-btn"
      className={`inline-flex items-center gap-1.5 px-1 sm:px-2 py-1 transition-colors group ${className}`}
    >
      <Star
        size={16}
        stroke="#aaa"
        fill="none"
        strokeWidth={2}
        className="group-hover:stroke-[#f59e0b] group-hover:fill-[#f59e0b] transition-all duration-300"
      />
      <span className="text-base font-semibold text-[#111]">
        {stars !== null ? stars.toLocaleString() : '---'}
      </span>
    </a>
  );
}
