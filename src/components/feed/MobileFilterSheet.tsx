import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MobileFilterSheetProps {
  children: ReactNode;
  activeFiltersCount: number;
}

export function MobileFilterSheet({ children, activeFiltersCount }: MobileFilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex items-center gap-2 justify-center min-h-11 relative"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 bg-primary text-primary-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] overflow-y-auto px-4 sm:px-6">
        <SheetHeader className="pb-3 sm:pb-4">
          <SheetTitle className="text-base sm:text-lg">Filtros e Preferências</SheetTitle>
        </SheetHeader>
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
