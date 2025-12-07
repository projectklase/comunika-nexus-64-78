import { Skeleton } from "@/components/ui/skeleton";

export function FeedLoadingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-live="polite" aria-label="Carregando posts">
      {/* Mensagem feliz */}
      <div className="glass-card p-4 sm:p-6 text-center space-y-1.5 sm:space-y-2">
        <div className="text-3xl sm:text-4xl animate-bounce inline-block">📚</div>
        <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Carregando novidades...
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Buscando as últimas atualizações da escola
        </p>
      </div>

      {/* Skeleton cards */}
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-3 sm:p-4 space-y-2 sm:space-y-3">
            {/* Header */}
            <div className="flex items-start gap-2 sm:gap-3">
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 sm:space-y-2">
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-24" />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-1.5 sm:space-y-2">
              <Skeleton className="h-4 sm:h-5 w-3/4" />
              <Skeleton className="h-3 sm:h-4 w-full" />
              <Skeleton className="h-3 sm:h-4 w-5/6" />
            </div>
            
            {/* Footer */}
            <div className="flex gap-2 pt-1.5 sm:pt-2">
              <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
              <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
