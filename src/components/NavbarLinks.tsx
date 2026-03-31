'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavbarLinks() {
  const pathname = usePathname();
  const isRepoPage = pathname?.match(/^\/[^/]+\/[^/]+/);

  const navLinksMargin = isRepoPage ? 'lg:ml-64' : '';

  return (
    <div className={`hidden md:flex items-center gap-6 px-4 sm:px-6 transition-all duration-300 ${isRepoPage ? 'lg:absolute' : 'ml-8'} ${navLinksMargin}`}>
      <Link
        href="/users"
        className="text-base font-medium text-[#888] hover:text-[#111] transition-colors"
        data-testid="nav-profiles-link"
      >
        Profiles
      </Link>
      <Link
        href="/repos"
        className="text-base font-medium text-[#888] hover:text-[#111] transition-colors"
        data-testid="nav-repos-link"
      >
        Repos
      </Link>
      <Link
        href="/arena"
        className="text-base font-medium text-[#888] hover:text-[#111] transition-colors"
        data-testid="nav-arena-link"
      >
        Dev Rank
      </Link>
      <Link
        href="/developers"
        className="text-base font-medium text-[#888] hover:text-[#111] transition-colors"
        data-testid="nav-developers-link"
      >
        Developers
      </Link>
    </div>
  );
}
