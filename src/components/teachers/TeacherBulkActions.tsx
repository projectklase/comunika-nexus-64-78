import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePeopleStore } from '@/stores/people-store';
import { useClassStore } from '@/stores/class-store';
import { Person } from '@/types/class';
import { useToast } from '@/hooks/use-toast';
import { Archive, Users, UserMinus, Trash2 } from 'lucide-react';

interface TeacherBulkActionsProps {
  selectedTeachers: Person[];
  onClearSelection: () => void;
}

export function TeacherBulkActions({ selectedTeachers, onClearSelection }: TeacherBulkActionsProps) {
  const [linkClassesOpen, setLinkClassesOpen] = useState(false);
  const [unlinkClassesOpen, setUnlinkClassesOpen] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { archiveTeacher, deletePerson } = usePeopleStore();
  const { classes, updateClass } = useClassStore();
  const { toast } = useToast();

  const activeClasses = classes.filter(c => c.status === 'ATIVA');

  const handleBulkArchive = async () => {
    setLoading(true);
    try {
      for (const teacher of selectedTeachers) {
        await archiveTeacher(teacher.id);
      }
      toast({
        title: "Professores arquivados",
        description: `${selectedTeachers.length} professor(es) arquivado(s) com sucesso.`,
      });
      onClearSelection();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar os professores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setArchiveConfirmOpen(false);
    }
  };

  const handleLinkToClasses = async () => {
    if (selectedClassIds.length === 0) {
      toast({
        title: "Nenhuma turma selecionada",
        description: "Selecione pelo menos uma turma.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      for (const teacher of selectedTeachers) {
        for (const classId of selectedClassIds) {
          const schoolClass = classes.find(c => c.id === classId);
          if (schoolClass && !schoolClass.teachers.includes(teacher.id)) {
            await updateClass(classId, {
              teachers: [...schoolClass.teachers, teacher.id]
            });
          }
        }
      }

      toast({
        title: "Professores vinculados",
        description: `${selectedTeachers.length} professor(es) vinculado(s) às turmas selecionadas.`,
      });
      
      setSelectedClassIds([]);
      setLinkClassesOpen(false);
      onClearSelection();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível vincular os professores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkFromClasses = async () => {
    if (selectedClassIds.length === 0) {
      toast({
        title: "Nenhuma turma selecionada",
        description: "Selecione pelo menos uma turma.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      for (const teacher of selectedTeachers) {
        for (const classId of selectedClassIds) {
          const schoolClass = classes.find(c => c.id === classId);
          if (schoolClass && schoolClass.teachers.includes(teacher.id)) {
            await updateClass(classId, {
              teachers: schoolClass.teachers.filter(id => id !== teacher.id)
            });
          }
        }
      }

      toast({
        title: "Professores removidos",
        description: `${selectedTeachers.length} professor(es) removido(s) das turmas selecionadas.`,
      });
      
      setSelectedClassIds([]);
      setUnlinkClassesOpen(false);
      onClearSelection();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover os professores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedTeachers.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <span className="text-sm font-medium">
          {selectedTeachers.length} professor(es) selecionado(s)
        </span>
        
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkClassesOpen(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Vincular a Turmas
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnlinkClassesOpen(true)}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Remover de Turmas
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setArchiveConfirmOpen(true)}
          >
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Link to Classes Modal */}
      <Dialog open={linkClassesOpen} onOpenChange={setLinkClassesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Professores às Turmas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar Turmas</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {activeClasses.map((schoolClass) => (
                  <div key={schoolClass.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`link-class-${schoolClass.id}`}
                      checked={selectedClassIds.includes(schoolClass.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClassIds(prev => [...prev, schoolClass.id]);
                        } else {
                          setSelectedClassIds(prev => prev.filter(id => id !== schoolClass.id));
                        }
                      }}
                    />
                    <Label htmlFor={`link-class-${schoolClass.id}`} className="text-sm">
                      {schoolClass.name} {schoolClass.code && `(${schoolClass.code})`} - 
                      {schoolClass.daysOfWeek.join(', ')} {schoolClass.startTime}-{schoolClass.endTime}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLinkClassesOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleLinkToClasses} disabled={loading}>
                {loading ? 'Vinculando...' : 'Vincular'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlink from Classes Modal */}
      <Dialog open={unlinkClassesOpen} onOpenChange={setUnlinkClassesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Professores das Turmas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar Turmas</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {activeClasses.map((schoolClass) => (
                  <div key={schoolClass.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`unlink-class-${schoolClass.id}`}
                      checked={selectedClassIds.includes(schoolClass.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClassIds(prev => [...prev, schoolClass.id]);
                        } else {
                          setSelectedClassIds(prev => prev.filter(id => id !== schoolClass.id));
                        }
                      }}
                    />
                    <Label htmlFor={`unlink-class-${schoolClass.id}`} className="text-sm">
                      {schoolClass.name} {schoolClass.code && `(${schoolClass.code})`} - 
                      {schoolClass.daysOfWeek.join(', ')} {schoolClass.startTime}-{schoolClass.endTime}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setUnlinkClassesOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUnlinkFromClasses} disabled={loading}>
                {loading ? 'Removendo...' : 'Remover'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Arquivamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar {selectedTeachers.length} professor(es) selecionado(s)?
              Eles poderão ser reativados posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive} disabled={loading}>
              {loading ? 'Arquivando...' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}