import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  color,
  className,
}: StatCardProps) {
  return (
    <div className={cn('py-3', className)}>
      <div className="text-[11px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">
        {title}
      </div>
      <div
        className="text-[28px] font-semibold leading-tight"
        style={{ color: color || '#111' }}
      >
        {value}
      </div>
      {subtitle && <div className="text-[12px] text-[#aaa] mt-1">{subtitle}</div>}
    </div>
  );
}
