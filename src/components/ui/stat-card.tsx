import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'error';
  className?: string;
}

const variantStyles = {
  default: '',
  success: 'border-green-200 bg-green-50/50 dark:bg-green-950/20',
  warning: 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20',
  info: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20',
  error: 'border-red-200 bg-red-50/50 dark:bg-red-950/20',
};

const variantIconStyles = {
  default: 'text-gray-700 dark:text-gray-400',
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-yellow-700 dark:text-yellow-400',
  info: 'text-blue-700 dark:text-blue-400',
  error: 'text-red-700 dark:text-red-400',
};

const variantValueStyles = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
  error: 'text-red-600 dark:text-red-400',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="pb-3">
        <CardTitle
          className={cn(
            'text-sm flex items-center gap-2',
            variant === 'default' ? 'text-muted-foreground' : variantIconStyles[variant]
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-4xl font-bold', variantValueStyles[variant])}>{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
