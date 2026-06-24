import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon, title, description, actionLabel, onAction, className,
}) => (
  <Card className={`p-10 flex flex-col items-center text-center gap-3 ${className || ''}`}>
    {Icon && (
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
    )}
    <h3 className="text-base font-semibold">{title}</h3>
    {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
    {actionLabel && onAction && (
      <Button size="sm" className="mt-2" onClick={onAction}>{actionLabel}</Button>
    )}
  </Card>
);

export default EmptyState;
