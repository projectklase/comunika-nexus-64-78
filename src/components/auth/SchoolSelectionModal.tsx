import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { School } from '@/types/school';
import { cn } from '@/lib/utils';

interface SchoolSelectionModalProps {
  open: boolean;
  schools: School[];
  onSelectSchool: (schoolId: string) => void;
}

/**
 * Modal de seleção de escola para professores que atuam em múltiplas escolas.
 * Exibido no PRIMEIRO LOGIN do professor multi-escola.
 */
export function SchoolSelectionModal({ 
  open, 
  schools, 
  onSelectSchool 
}: SchoolSelectionModalProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedSchoolId) {
      onSelectSchool(selectedSchoolId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px] glass-card"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-primary" />
            Selecione a Escola
          </DialogTitle>
          <DialogDescription>
            Você atua em múltiplas escolas. Selecione em qual escola deseja trabalhar agora.
            Você poderá trocar depois usando o seletor de escolas no menu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {schools.map((school) => (
            <Card
              key={school.id}
              className={cn(
                "cursor-pointer transition-all hover:scale-[1.02]",
                selectedSchoolId === school.id
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "hover:border-primary/50"
              )}
              onClick={() => setSelectedSchoolId(school.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedSchoolId === school.id
                      ? "bg-primary/20"
                      : "bg-accent/50"
                  )}>
                    <Building2 className={cn(
                      "h-5 w-5",
                      selectedSchoolId === school.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {school.slug}
                    </p>
                  </div>
                </div>
                {selectedSchoolId === school.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in-50" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          onClick={handleConfirm}
          disabled={!selectedSchoolId}
          className="w-full"
          size="lg"
        >
          Confirmar Escola
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
