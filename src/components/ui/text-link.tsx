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
    'relative pb-1 transition-colors',
    'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:transition-transform after:duration-200 after:ease-out after:origin-left',
    size === 'sm' ? 'text-sm' : 'text-base',
    active
      ? 'text-[#111] font-semibold after:scale-x-100 after:bg-[#111]'
      : 'text-[#999] hover:text-[#666] active:text-[#111] after:scale-x-0 hover:after:scale-x-100 after:bg-[#666] active:after:bg-[#111]',
    className
  );

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{children}</a>;
  }
  return <Link href={href} className={classes}>{children}</Link>;
}
