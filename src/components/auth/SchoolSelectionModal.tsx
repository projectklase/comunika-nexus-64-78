import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Building2, Check } from 'lucide-react';
import { useSchool } from '@/contexts/SchoolContext';
import { cn } from '@/lib/utils';

interface SchoolSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal exibido no primeiro login de professores com múltiplas escolas
 * Permite que o professor escolha em qual escola deseja entrar
 */
export function SchoolSelectionModal({ open, onOpenChange }: SchoolSelectionModalProps) {
  const { availableSchools, currentSchool, switchSchool } = useSchool();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(currentSchool?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedSchoolId) return;

    setIsLoading(true);
    try {
      await switchSchool(selectedSchoolId);
      
      // Salvar flag para não mostrar novamente
      localStorage.setItem('has_seen_school_selector', 'true');
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error switching school:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6 text-primary" />
            Selecione a Escola
          </DialogTitle>
          <DialogDescription className="text-base">
            Você está vinculado a múltiplas escolas. Por favor, selecione em qual escola deseja entrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {availableSchools.map((school) => (
            <Card
              key={school.id}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                selectedSchoolId === school.id
                  ? "bg-gradient-to-r from-primary/20 to-primary/10 border-primary shadow-lg shadow-primary/20"
                  : "bg-accent/5 hover:bg-accent/10 border-border/40"
              )}
              onClick={() => setSelectedSchoolId(school.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {school.logo_url ? (
                    <img
                      src={school.logo_url}
                      alt={school.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{school.name}</h3>
                    <p className="text-sm text-muted-foreground">{school.slug}</p>
                  </div>
                </div>
                {selectedSchoolId === school.id && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={handleConfirm}
            disabled={!selectedSchoolId || isLoading}
            className="glass-button min-w-[120px]"
          >
            {isLoading ? 'Carregando...' : 'Confirmar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
