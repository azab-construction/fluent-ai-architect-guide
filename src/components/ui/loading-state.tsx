import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  variant?: 'skeleton' | 'spinner';
  label?: string;
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'skeleton', label, rows = 4, className,
}) => {
  if (variant === 'spinner') {
    return (
      <Card className={`p-10 flex flex-col items-center gap-3 ${className || ''}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
      </Card>
    );
  }
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
};

export default LoadingState;
