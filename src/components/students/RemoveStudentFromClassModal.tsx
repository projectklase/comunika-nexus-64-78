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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RemoveStudentFromClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  onSuccess?: () => void;
}

export function RemoveStudentFromClassModal({ 
  open, 
  onOpenChange, 
  studentIds, 
  onSuccess 
}: RemoveStudentFromClassModalProps) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  const { classes, removeStudent } = useClassStore();

  useEffect(() => {
    const loadStudents = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', studentIds);
      
      if (data) setStudents(data);
    };
    
    if (studentIds.length > 0) loadStudents();
  }, [studentIds]);
  
  // Get classes that have at least one of the selected students
  const relevantClasses = classes.filter(c => 
    c.students.some(studentId => studentIds.includes(studentId))
  );

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
      // Update class store directly (no junction table yet)
      for (const classId of selectedClasses) {
        for (const studentId of studentIds) {
          await removeStudent(classId, studentId);
        }
      }
      
      toast.success(
        `${students.length} aluno(s) removido(s) de ${selectedClasses.length} turma(s)`
      );
      
      setSelectedClasses([]);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing students:', error);
      toast.error('Erro ao remover alunos das turmas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>Remover Alunos das Turmas</DialogTitle>
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
              <Label>Selecione as turmas para remover</Label>
              <ScrollArea className="max-h-60 border rounded-md p-3">
                {relevantClasses.length > 0 ? (
                  <div className="space-y-2">
                    {relevantClasses.map((schoolClass) => {
                      const hasStudents = schoolClass.students.some(id => studentIds.includes(id));
                      const studentCount = schoolClass.students.filter(id => studentIds.includes(id)).length;
                      
                      return (
                        <div key={schoolClass.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={schoolClass.id}
                            checked={selectedClasses.includes(schoolClass.id)}
                            onCheckedChange={(checked) => 
                              handleClassToggle(schoolClass.id, checked as boolean)
                            }
                            disabled={!hasStudents}
                          />
                          <Label 
                            htmlFor={schoolClass.id} 
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {schoolClass.name}
                            {schoolClass.code && (
                              <span className="text-muted-foreground ml-2">
                                ({schoolClass.code})
                              </span>
                            )}
                            <span className="text-muted-foreground ml-2">
                              - {studentCount} aluno(s)
                            </span>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma turma encontrada com os alunos selecionados
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
                variant="destructive"
              >
                {loading ? 'Removendo...' : 'Remover'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}