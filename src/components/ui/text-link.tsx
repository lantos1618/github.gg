import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TextLinkProps {
  href: string;
  className?: string;
  active?: boolean;
  size?: 'sm' | 'base';
  external?: boolean;
  children: React.ReactNode;
}

export function TextLink({ href, className, active, size = 'sm', external, children }: TextLinkProps) {
  const classes = cn(
    'border-b-2 transition-colors',
    size === 'sm' ? 'text-sm' : 'text-base',
    active
      ? 'border-[#111] text-[#111]'
      : 'border-transparent text-[#999] hover:text-[#666] hover:border-[#666] active:text-[#111] active:border-[#111]',
    className
  );

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{children}</a>;
  }
  return <Link href={href} className={classes}>{children}</Link>;
}
