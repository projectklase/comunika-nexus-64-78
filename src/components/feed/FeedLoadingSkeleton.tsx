export function FeedLoadingSkeleton() {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 sm:py-16" 
      role="status" 
      aria-live="polite" 
      aria-label="Carregando posts"
    >
      {/* Spinner animado estilo lua/crescente */}
      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/30 border-t-primary mx-auto mb-4"></div>
      <p className="text-sm sm:text-base text-muted-foreground">
        Carregando posts...
      </p>
    </div>
  );
}
