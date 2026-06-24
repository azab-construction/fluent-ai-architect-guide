import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'حدث خطأ', message, onRetry, className,
}) => (
  <Card className={`p-6 border-destructive/50 bg-destructive/5 ${className || ''}`}>
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-destructive">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 break-words">{message}</p>
        {onRetry && (
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 ml-2" /> إعادة المحاولة
          </Button>
        )}
      </div>
    </div>
  </Card>
);

export default ErrorState;
