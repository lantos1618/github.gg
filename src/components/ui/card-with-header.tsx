import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardWithHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CardWithHeader({
  title,
  description,
  icon: _icon,
  action,
  children,
  className,
  contentClassName,
}: CardWithHeaderProps) {
  return (
    <div className={cn('border-b border-[#eee] pb-8 mb-8', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-1">
            {title}
          </div>
          {description && <p className="text-[14px] text-[#888]">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0 ml-4">{action}</div>}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
