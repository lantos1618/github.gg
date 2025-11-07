import Link from 'next/link';
import { LucideIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  label: string;
  path: string;
  icon: LucideIcon;
  isActive: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function NavItem({
  label,
  path,
  icon: Icon,
  isActive,
  isExpanded,
  hasChildren,
  onToggle,
  className,
}: NavItemProps) {
  const content = (
    <>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {hasChildren && (
        <button onClick={(e) => { e.preventDefault(); onToggle?.(); }} className="p-1">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </>
  );

  const baseClasses = cn(
    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors',
    isActive
      ? 'bg-gray-900 text-white font-medium'
      : 'text-gray-700 hover:bg-gray-100',
    className
  );

  if (hasChildren) {
    return (
      <div className={baseClasses}>
        {content}
      </div>
    );
  }

  return (
    <Link href={path} className={baseClasses}>
      {content}
    </Link>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function NavGroup({ title, children, className }: NavGroupProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </div>
      {children}
    </div>
  );
}
