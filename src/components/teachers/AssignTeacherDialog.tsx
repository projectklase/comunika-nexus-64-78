import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useTeachers } from '@/hooks/useTeachers';
import { useClassStore } from '@/stores/class-store';
import { Person } from '@/types/class';
import { useToast } from '@/hooks/use-toast';
import { Search, Users } from 'lucide-react';

interface AssignTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
}

export function AssignTeacherDialog({ open, onOpenChange, classId, className }: AssignTeacherDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { teachers } = useTeachers();
  const { updateClass, getClass } = useClassStore();
  const { toast } = useToast();

  const currentClass = getClass(classId);
  const currentTeacherIds = currentClass?.teachers || [];

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignTeachers = async () => {
    if (selectedTeachers.length === 0) {
      toast({
        title: "Nenhum professor selecionado",
        description: "Selecione pelo menos um professor.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updatedTeachers = [...new Set([...currentTeacherIds, ...selectedTeachers])];
      await updateClass(classId, { teachers: updatedTeachers });

      toast({
        title: "Professores atribuídos",
        description: `${selectedTeachers.length} professor(es) atribuído(s) à turma ${className}.`,
      });

      onOpenChange(false);
      setSelectedTeachers([]);
      setSearchQuery('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atribuir os professores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTeacherClasses = (teacherId: string) => {
    // Get classes from the store for this teacher
    const { classes } = useClassStore.getState();
    return classes.filter(c => c.teachers.includes(teacherId) && c.status === 'ATIVA');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Professor à Turma {className}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar Professores</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome ou e-mail"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Professores Disponíveis</Label>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredTeachers.map((teacher) => {
                const isAlreadyAssigned = currentTeacherIds.includes(teacher.id);
                const teacherClasses = getTeacherClasses(teacher.id);
                
                return (
                  <div key={teacher.id} className="flex items-start space-x-3 p-2 rounded border">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTeachers(prev => [...prev, teacher.id]);
                        } else {
                          setSelectedTeachers(prev => prev.filter(id => id !== teacher.id));
                        }
                      }}
                      disabled={isAlreadyAssigned}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`teacher-${teacher.id}`} className="font-medium">
                          {teacher.name}
                        </Label>
                        {isAlreadyAssigned && (
                          <Badge variant="secondary" className="text-xs">
                            Já atribuído
                          </Badge>
                        )}
                      </div>
                       <p className="text-sm text-muted-foreground">
                         {teacher.email || 'Sem e-mail'}
                       </p>
                       {teacherClasses.length > 0 && (
                         <div className="flex items-center gap-1 text-xs text-muted-foreground">
                           <Users className="h-3 w-3" />
                           <span>{teacherClasses.length} turma(s)</span>
                         </div>
                       )}
                    </div>
                  </div>
                );
              })}
              
              {filteredTeachers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum professor encontrado
                </p>
              )}
            </div>
          </div>

          {selectedTeachers.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                {selectedTeachers.length} professor(es) selecionado(s)
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTeachers.map(teacherId => {
                  const teacher = teachers.find(t => t.id === teacherId);
                  return teacher ? (
                    <Badge key={teacherId} variant="default">
                      {teacher.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignTeachers} 
              disabled={loading || selectedTeachers.length === 0}
            >
              {loading ? 'Atribuindo...' : 'Atribuir Professores'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}