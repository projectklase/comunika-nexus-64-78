import { Loader2 } from 'lucide-react';

interface PageLoadingSkeletonProps {
  message?: string;
}

export function PageLoadingSkeleton({ message = "Carregando..." }: PageLoadingSkeletonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
      <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
