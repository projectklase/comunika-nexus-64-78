import { SchoolClass } from '@/types/class';
import { useClassStore } from '@/stores/class-store';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  UserMinus, 
  MoreHorizontal, 
  Trash2, 
  ArrowRightLeft,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from './ConfirmDialog';

interface ClassRosterProps {
  schoolClass: SchoolClass;
  selectedStudents: string[];
  onSelectedStudentsChange: (selected: string[]) => void;
  onAddStudents: () => void;
  onTransferStudents: () => void;
}

export function ClassRoster({
  schoolClass,
  selectedStudents,
  onSelectedStudentsChange,
  onAddStudents,
  onTransferStudents
}: ClassRosterProps) {
  const { toast } = useToast();
  const { removeStudent, removeTeacher } = useClassStore();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [confirmRemove, setConfirmRemove] = useState<{
    type: 'student' | 'teacher';
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadRosterData();
  }, [schoolClass.id]);

  const loadRosterData = async () => {
    setLoading(true);
    try {
      // Load students via JOIN with user_roles
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(id, name, email, avatar)
        `)
        .eq('role', 'aluno')
        .in('user_id', schoolClass.students);
      
      if (studentRoles) {
        setStudents(studentRoles.map((sr: any) => sr.profiles));
      }

      // Load teachers via JOIN with user_roles
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(id, name, email, avatar)
        `)
        .eq('role', 'professor')
        .in('user_id', schoolClass.teachers);
      
      if (teacherRoles) {
        setTeachers(teacherRoles.map((tr: any) => tr.profiles));
      }
    } catch (error) {
      console.error('Error loading roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    onSelectedStudentsChange(checked ? schoolClass.students : []);
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    onSelectedStudentsChange(
      checked 
        ? [...selectedStudents, studentId]
        : selectedStudents.filter(id => id !== studentId)
    );
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await removeStudent(schoolClass.id, studentId);
      await loadRosterData();
      toast({
        title: "Aluno removido",
        description: "O aluno foi removido da turma com sucesso.",
      });
      onSelectedStudentsChange(selectedStudents.filter(id => id !== studentId));
      setConfirmRemove(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o aluno.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    try {
      await removeTeacher(schoolClass.id, teacherId);
      toast({
        title: "Professor removido",
        description: "O professor foi removido da turma com sucesso.",
      });
      setConfirmRemove(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o professor.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Teachers Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Professores ({teachers.length})
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {teachers.length > 0 ? (
            teachers.map(teacher => (
              <Badge 
                key={teacher.id} 
                variant="secondary" 
                className="flex items-center gap-2 px-3 py-2"
              >
                <span>{teacher.name}</span>
                <button
                  onClick={() => setConfirmRemove({
                    type: 'teacher',
                    id: teacher.id,
                    name: teacher.name
                  })}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">
              Nenhum professor atribuído
            </span>
          )}
        </div>
      </div>

      {/* Students Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Alunos ({students.length})
          </h2>
          
          <div className="flex gap-2">
            {selectedStudents.length > 0 && (
              <Button
                variant="outline"
                onClick={onTransferStudents}
                className="glass-button"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir ({selectedStudents.length})
              </Button>
            )}
            
            <Button onClick={onAddStudents} className="glass-button">
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Alunos
            </Button>
          </div>
        </div>

        {students.length > 0 ? (
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow 
                    key={student.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => 
                          handleSelectStudent(student.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email || '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setConfirmRemove({
                              type: 'student',
                              id: student.id,
                              name: student.name
                            })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <UserMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum aluno matriculado nesta turma.</p>
            <p className="text-sm">Use o botão "Adicionar Alunos" para começar.</p>
          </div>
        )}
      </div>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title={`Remover ${confirmRemove?.type === 'student' ? 'Aluno' : 'Professor'}`}
        description={`Tem certeza que deseja remover ${confirmRemove?.name} da turma?`}
        confirmText="Remover"
        onConfirm={() => {
          if (confirmRemove?.type === 'student') {
            handleRemoveStudent(confirmRemove.id);
          } else if (confirmRemove?.type === 'teacher') {
            handleRemoveTeacher(confirmRemove.id);
          }
        }}
        variant="destructive"
      />
    </div>
  );
}