import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LinkStudentToClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  onSuccess?: () => void;
}

export function LinkStudentToClassModal({ 
  open, 
  onOpenChange, 
  studentIds, 
  onSuccess 
}: LinkStudentToClassModalProps) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { getActiveClasses, addStudents } = useClassStore();
  const { getPerson } = usePeopleStore();

  const activeClasses = getActiveClasses();
  const students = studentIds.map(id => getPerson(id)).filter(Boolean);

  const handleClassToggle = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses(prev => [...prev, classId]);
    } else {
      setSelectedClasses(prev => prev.filter(id => id !== classId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedClasses.length === 0) {
      toast.error('Selecione pelo menos uma turma');
      return;
    }

    setLoading(true);
    try {
      for (const classId of selectedClasses) {
        await addStudents(classId, studentIds);
      }
      
      toast.success(
        `${students.length} aluno(s) vinculado(s) a ${selectedClasses.length} turma(s)`
      );
      
      setSelectedClasses([]);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao vincular alunos às turmas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Alunos às Turmas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              Alunos selecionados ({students.length})
            </Label>
            <div className="mt-2 p-3 bg-muted/50 rounded-md">
              <ScrollArea className="max-h-20">
                {students.map((student) => (
                  <div key={student.id} className="text-sm">
                    {student.name}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione as turmas</Label>
              <ScrollArea className="max-h-60 border rounded-md p-3">
                {activeClasses.length > 0 ? (
                  <div className="space-y-2">
                    {activeClasses.map((schoolClass) => (
                      <div key={schoolClass.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={schoolClass.id}
                          checked={selectedClasses.includes(schoolClass.id)}
                          onCheckedChange={(checked) => 
                            handleClassToggle(schoolClass.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={schoolClass.id} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {schoolClass.name}
                          {schoolClass.code && (
                            <span className="text-muted-foreground ml-2">
                              ({schoolClass.code})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma turma ativa encontrada
                  </p>
                )}
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || selectedClasses.length === 0}
              >
                {loading ? 'Vinculando...' : 'Vincular'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}