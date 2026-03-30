import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('py-16 text-center', className)}>
      <p className="text-[16px] font-medium text-[#111] mb-1">{title}</p>
      {description && <p className="text-[14px] text-[#aaa] max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
