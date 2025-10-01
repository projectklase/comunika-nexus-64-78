import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClassSubjectStore } from '@/stores/class-subject-store';
import { useSubjects } from '@/hooks/useSubjects';
import { usePeopleStore } from '@/stores/people-store';
import { SchoolClass } from '@/types/class';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { AddSubjectsModal } from './AddSubjectsModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface ClassSubjectsSectionProps {
  schoolClass: SchoolClass;
}

export function ClassSubjectsSection({ schoolClass }: ClassSubjectsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    classSubjects,
    loadClassSubjects,
    getClassSubjects,
    assignTeacherToSubject,
    removeSubjectFromClass
  } = useClassSubjectStore();
  const { subjects } = useSubjects();
  const { people, loadPeople, getPeopleByRole } = usePeopleStore();
  
  const [showAddSubjects, setShowAddSubjects] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [subjectToRemove, setSubjectToRemove] = useState<string | null>(null);

  const isSecretary = user?.role === 'secretaria';
  const classSubjectsList = getClassSubjects(schoolClass.id);
  const teachers = getPeopleByRole('PROFESSOR');

  useEffect(() => {
    loadClassSubjects();
    loadPeople();
  }, [loadClassSubjects, loadPeople]);

  const handleAssignTeacher = async (subjectId: string, teacherId: string) => {
    try {
      await assignTeacherToSubject(schoolClass.id, subjectId, teacherId);
      toast({
        title: "Professor atribuído",
        description: "Professor foi atribuído à matéria com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o professor.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSubject = async () => {
    if (!subjectToRemove) return;
    
    try {
      await removeSubjectFromClass(schoolClass.id, subjectToRemove);
      toast({
        title: "Matéria removida",
        description: "A matéria foi removida do plano da turma.",
      });
      setShowRemoveConfirm(false);
      setSubjectToRemove(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a matéria.",
        variant: "destructive",
      });
    }
  };

  const getTeacherBySubject = (subjectId: string) => {
    const classSubject = classSubjectsList.find(cs => cs.subjectId === subjectId);
    return classSubject?.teacherId ? people.find(p => p.id === classSubject.teacherId) : null;
  };

  const getSubjectsByClass = () => {
    return classSubjectsList
      .map(cs => subjects.find(s => s.id === cs.subjectId))
      .filter(Boolean)
      .sort((a, b) => a!.name.localeCompare(b!.name));
  };

  const classSubjectsData = getSubjectsByClass();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold gradient-text">Plano da Turma</h2>
            <p className="text-muted-foreground text-sm">
              Gerencie as matérias e professores desta turma
            </p>
          </div>
        </div>
        
        {isSecretary && (
          <Button 
            onClick={() => setShowAddSubjects(true)}
            className="glass-button"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Matérias
          </Button>
        )}
      </div>

      {/* Subject Chips */}
      {classSubjectsData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {classSubjectsData.map(subject => (
            <Badge key={subject!.id} variant="secondary" className="glass-soft">
              {subject!.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Subjects Table */}
      <div className="glass rounded-lg overflow-hidden">
        {classSubjectsData.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma matéria adicionada
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isSecretary 
                ? "Adicione matérias ao plano desta turma para começar." 
                : "Esta turma ainda não possui matérias cadastradas."}
            </p>
            {isSecretary && (
              <Button 
                onClick={() => setShowAddSubjects(true)}
                className="glass-button"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Matérias
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border/50 bg-muted/20">
                <tr>
                  <th className="text-left p-4 font-medium">Matéria</th>
                  <th className="text-left p-4 font-medium">Professor</th>
                  {isSecretary && (
                    <th className="text-right p-4 font-medium">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {classSubjectsData.map(subject => {
                  const assignedTeacher = getTeacherBySubject(subject!.id);
                  return (
                    <tr key={subject!.id} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{subject!.name}</div>
                          {subject!.description && (
                            <div className="text-sm text-muted-foreground">
                              {subject!.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {isSecretary ? (
                          <Select
                            value={assignedTeacher?.id || 'none'}
                            onValueChange={(teacherId) => {
                              if (teacherId !== 'none') {
                                handleAssignTeacher(subject!.id, teacherId);
                              }
                            }}
                          >
                            <SelectTrigger className="glass-input w-48">
                              <SelectValue placeholder="Selecionar professor" />
                            </SelectTrigger>
                            <SelectContent className="glass-card z-50 bg-background">
                              <SelectItem value="none">Selecionar professor</SelectItem>
                              {teachers.map(teacher => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {teacher.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">
                            {assignedTeacher?.name || 'Não atribuído'}
                          </span>
                        )}
                      </td>
                      {isSecretary && (
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubjectToRemove(subject!.id);
                              setShowRemoveConfirm(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Subjects Modal */}
      <AddSubjectsModal
        open={showAddSubjects}
        onOpenChange={setShowAddSubjects}
        schoolClass={schoolClass}
      />

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remover Matéria"
        description="Tem certeza que deseja remover esta matéria do plano da turma? O professor atribuído também será removido."
        confirmText="Remover"
        onConfirm={handleRemoveSubject}
        variant="destructive"
      />
    </div>
  );
}