'use client';

import { Columns2, Columns3 } from 'lucide-react';
import { usePageWidth } from '@/lib/page-width-context';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function PageWidthToggle() {
  const { width, toggle } = usePageWidth();
  const isFocused = width === 'focused';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          aria-label={isFocused ? 'Switch to wide layout' : 'Switch to focused layout'}
          data-testid="page-width-toggle"
          className="inline-flex items-center justify-center p-1.5 rounded-md text-[#999] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors"
        >
          {isFocused ? (
            <Columns2 size={16} strokeWidth={1.8} />
          ) : (
            <Columns3 size={16} strokeWidth={1.8} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-[#333] text-white">
        {isFocused ? 'Wide layout' : 'Focused layout'}
      </TooltipContent>
    </Tooltip>
  );
}
