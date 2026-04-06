'use client';

import { usePageWidth, getWidthClass } from '@/lib/page-width-context';
import { cn } from '@/lib/utils';

/**
 * A container that respects the user's page-width preference (focused / wide).
 * Drop-in replacement for `<div className="w-[90%] max-w-5xl mx-auto ...">`.
 *
 * Use `base="narrow"` for profile-style pages that default to max-w-[900px].
 */
export function PageWidthContainer({
  children,
  className,
  base = 'default',
  as: Tag = 'div',
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  base?: 'default' | 'narrow';
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  const { width } = usePageWidth();
  const widthClass = getWidthClass(width, base);

  return (
    <Tag className={cn('w-[90%] mx-auto', widthClass, className)} {...rest}>
      {children}
    </Tag>
  );
}
