import Link from 'next/link';
import { StarCount } from './StarCount';
import { NavbarClient } from './NavbarClient';
import { NavbarLinks } from './NavbarLinks';
import { PageWidthToggle } from './PageWidthToggle';

export function NavbarServer() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-white border-b border-[#eee]">
      <div className="relative flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0 px-4 sm:px-6 z-10 group" data-testid="nav-logo-link">
          <span className="font-semibold text-[18px] tracking-tight text-[#111] group-hover:opacity-70 transition-opacity">
            GG
          </span>
        </Link>

        {/* Navigation Links */}
        <NavbarLinks />

        {/* Right side */}
        <div className="flex items-center gap-4 ml-auto px-4 sm:px-6">
          <StarCount owner="lantos1618" repo="github.gg" />
          <PageWidthToggle />
          <NavbarClient />
        </div>
      </div>
    </nav>
  );
}
