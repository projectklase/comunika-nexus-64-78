import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AgendaSkeletonProps {
  count?: number;
  className?: string;
}

export function AgendaSkeleton({ count = 6, className }: AgendaSkeletonProps) {
  return (
    <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="glass-card min-h-[200px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            
            <Skeleton className="h-12 w-full rounded-lg" />
            
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
            </div>
            
            <div className="flex items-center gap-2 pt-3 border-t border-border/30">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 ml-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <Card className="glass-card border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, j) => (
                <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-border/20">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-6" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MiniCalendarSkeleton() {
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-7 w-7" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <Skeleton className="h-3 w-32 mx-auto mb-3" />
        
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          
          {/* Days */}
          {Array.from({ length: 14 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-center gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-1">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}