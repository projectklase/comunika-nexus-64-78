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
          className="w-full sm:w-auto flex items-center gap-2 justify-center relative"
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
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros e Preferências</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
