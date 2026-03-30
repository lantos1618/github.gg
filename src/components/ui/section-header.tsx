import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  label?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  label,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-start justify-between">
        <div>
          {label && (
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
              {label}
            </div>
          )}
          <h2 className="text-[22px] font-semibold text-[#111]">{title}</h2>
          {description && <p className="text-[14px] text-[#aaa] mt-1">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  label,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-10', className)}>
      <div className="flex items-start justify-between">
        <div>
          {label && (
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              {label}
            </div>
          )}
          <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#111] leading-tight">{title}</h1>
          {description && <p className="text-[14px] text-[#aaa] mt-2">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0 ml-4">{action}</div>}
      </div>
    </div>
  );
}
