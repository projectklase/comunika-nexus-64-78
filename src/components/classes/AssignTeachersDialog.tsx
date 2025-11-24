import { useState, useEffect } from 'react';
import { useClasses } from '@/hooks/useClasses';
import { useTeachers } from '@/hooks/useTeachers';
import { useSchool } from '@/contexts/SchoolContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignTeachersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  currentTeachers: string[];
}

export function AssignTeachersDialog({ 
  open, 
  onOpenChange, 
  classId, 
  currentTeachers 
}: AssignTeachersDialogProps) {
  const { toast } = useToast();
  const { assignTeachers } = useClasses();
  const { teachers: allTeachers, loading: teachersLoading, fetchTeachers } = useTeachers();
  const { currentSchool } = useSchool();
  
  const [search, setSearch] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  // Mapear teachers de useTeachers para o formato esperado
  const teachers = allTeachers.map(t => ({
    id: t.id,
    name: t.name,
    email: t.email,
    role: t.role,
    avatar: t.avatar,
    phone: t.phone,
    isActive: true,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  }));

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name?.toLowerCase().includes(search.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ FASE 1: Debug logs
  useEffect(() => {
    console.log('🔍 [AssignTeachersDialog] Debug Info:', {
      open,
      currentSchool: currentSchool?.name,
      schoolId: currentSchool?.id,
      allTeachers: allTeachers.length,
      teachersLoading,
      mappedTeachers: teachers.length,
      filteredTeachers: filteredTeachers.length
    });
  }, [open, currentSchool, allTeachers, teachersLoading, teachers, filteredTeachers]);

  // ✅ FASE 2: Forçar refetch ao abrir modal
  useEffect(() => {
    if (open && currentSchool) {
      console.log('🔄 [AssignTeachersDialog] Modal aberto, forçando reload de professores...');
      fetchTeachers();
    }
  }, [open, currentSchool, fetchTeachers]);

  useEffect(() => {
    setSelectedTeachers(currentTeachers);
  }, [currentTeachers, open]);

  const handleToggleTeacher = (teacherId: string) => {
    setSelectedTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSave = async () => {
    try {
      await assignTeachers(classId, selectedTeachers);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getTeacherLoad = (teacherId: string) => {
    // TODO: Implement this when we have proper teacher-class relationship
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="gradient-text">Atribuir Professores</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTeachers()}
            disabled={teachersLoading}
            className="text-xs"
          >
            {teachersLoading ? 'Carregando...' : '🔄 Atualizar'}
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar professores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 glass-input"
            />
          </div>

          {/* Selected Teachers */}
          {selectedTeachers.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Professores Selecionados</label>
              <div className="flex flex-wrap gap-2">
                {selectedTeachers.map(teacherId => {
                  const teacher = teachers.find(t => t.id === teacherId);
                  if (!teacher) return null;
                  
                  return (
                    <Badge 
                      key={teacherId} 
                      variant="secondary" 
                      className="flex items-center gap-2"
                    >
                      {teacher.name}
                      <button
                        onClick={() => handleToggleTeacher(teacherId)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Teacher List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <label className="text-sm font-medium">Professores Disponíveis</label>
            {teachersLoading && (
              <div className="text-center py-4 text-muted-foreground">
                Carregando professores...
              </div>
            )}
            {!teachersLoading && filteredTeachers.map(teacher => {
              const isSelected = selectedTeachers.includes(teacher.id);
              const load = getTeacherLoad(teacher.id);
              
              return (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => handleToggleTeacher(teacher.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleToggleTeacher(teacher.id)}
                    />
                    <div>
                      <div className="font-medium">{teacher.name}</div>
                      {teacher.email && (
                        <div className="text-sm text-muted-foreground">
                          {teacher.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      Carga: {load}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {load === 0 
                        ? 'Sem turmas' 
                        : `${load} turma${load > 1 ? 's' : ''}`
                      }
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ✅ FASE 3: Tratamento contextual de estado vazio */}
            {!teachersLoading && filteredTeachers.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground">
                  {!currentSchool 
                    ? '⚠️ Nenhuma escola selecionada'
                    : search 
                    ? 'Nenhum professor encontrado com este filtro.'
                    : teachers.length === 0
                    ? '⚠️ Nenhum professor cadastrado nesta escola ainda.'
                    : 'Nenhum professor disponível.'
                  }
                </p>
                {!currentSchool && (
                  <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-md inline-block">
                    Selecione uma escola no topo da página para continuar.
                  </p>
                )}
                {teachers.length === 0 && currentSchool && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Vá para "Cadastros → Professores" para adicionar professores.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/secretaria/professores'}
                      className="text-xs"
                    >
                      Ir para Professores
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="glass-button"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="glass-button">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}