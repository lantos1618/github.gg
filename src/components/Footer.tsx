'use client';

import Link from 'next/link';
import { PageWidthContainer } from '@/components/PageWidthContainer';

export function Footer() {
  return (
    <footer className="border-t border-[#eee] bg-white flex-shrink-0" data-testid="layout-footer">
      <PageWidthContainer className="py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[13px] text-[#aaa]">
            &copy; {new Date().getFullYear()} GG. Not affiliated with GitHub, Inc.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/developers" className="text-[13px] text-[#aaa] hover:text-[#111] transition-colors" data-testid="layout-footer-developers-link">
              Developers
            </Link>
            <Link href="/pricing" className="text-[13px] text-[#aaa] hover:text-[#111] transition-colors" data-testid="layout-footer-pricing-link">
              Pricing
            </Link>
          </div>
        </div>
      </PageWidthContainer>
    </footer>
  );
}
