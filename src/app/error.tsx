"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-[90%] max-w-[500px]">
            <div className="text-[11px] text-[#aaa] font-semibold tracking-[1.5px] uppercase mb-3">
              Error 500
            </div>
            <h1 className="text-[26px] font-semibold text-[#111] mb-2">
              Something went wrong
            </h1>
            <p className="text-[14px] text-[#666] leading-[1.6] mb-6">
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="text-[12px] text-[#aaa] mb-4 font-mono">
                ID: {error.digest}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 bg-[#111] text-white text-[13px] font-medium rounded-md hover:bg-[#333] transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-[#f8f9fa] text-[#333] text-[13px] font-medium rounded-md border border-[#ddd] hover:border-[#aaa] transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
