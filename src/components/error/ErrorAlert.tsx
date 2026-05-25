import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorAlert({
  title = 'Error',
  description,
  onRetry,
  onDismiss,
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className="space-y-4">
      <div className="flex gap-3">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </div>
      </div>
      {(onRetry || onDismiss) && (
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="text-destructive hover:text-destructive"
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-destructive hover:text-destructive"
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
}
