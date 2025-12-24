import Link from 'next/link';
import { StarCount } from './StarCount';
import { NavbarClient } from './NavbarClient';
import { NavbarLinks } from './NavbarLinks';

export function NavbarServer() {
  return (
    <nav className={`fixed top-0 z-50 w-full bg-white transition-all duration-300 border-b border-gray-100`}>
      <div className="relative flex h-14 items-center">
        {/* Logo/Brand - Always visible */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 px-4 sm:px-6 z-10 group">
          <span className="font-bold text-xl tracking-tight text-black group-hover:opacity-80 transition-opacity">
            GG
          </span>
        </Link>

        {/* Navigation Links - Client component handles pathname-based styling */}
        <NavbarLinks />

        {/* Navigation Actions - Right side */}
        <div className="flex items-center gap-4 ml-auto px-4 sm:px-6">
          {/* Star Button */}
          <StarCount owner="lantos1618" repo="github.gg" />

          {/* Auth Button - Client component handles auth state */}
          <NavbarClient />
        </div>
      </div>
    </nav>
  );
}
