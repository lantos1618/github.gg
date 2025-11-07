import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 text-muted-foreground', className)}>
      {Icon && <Icon className="h-16 w-16 mx-auto mb-4 opacity-50" />}
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm mt-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
