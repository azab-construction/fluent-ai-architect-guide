import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  fullPage?: boolean;
}

export function PageLoader({ message = 'Loading...', fullPage = true }: PageLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {content}
      </div>
    );
  }

  return content;
}
