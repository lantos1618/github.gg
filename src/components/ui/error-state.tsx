import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Error',
  message,
  retry,
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {retry && (
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="mt-3"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ErrorPage({ message, retry }: Omit<ErrorStateProps, 'title'>) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <ErrorState message={message} retry={retry} className="max-w-md" />
    </div>
  );
}
