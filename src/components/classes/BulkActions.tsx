import { useState, useEffect } from 'react';
import { useClassStore } from '@/stores/class-store';
import { useTeachers } from '@/hooks/useTeachers';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, UserPlus } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface BulkActionsProps {
  selectedIds: string[];
  onComplete: () => void;
}

export function BulkActions({ selectedIds, onComplete }: BulkActionsProps) {
  const { toast } = useToast();
  const { bulkArchive, bulkAssignTeacher } = useClassStore();
  const { teachers, loading: teachersLoading, fetchTeachers } = useTeachers();
  const { currentSchool } = useSchool();
  
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  // 🔍 Debug logs para validação
  useEffect(() => {
    console.log('🎯 [BulkActions] Estado:', {
      currentSchool: currentSchool?.name,
      teachersCount: teachers.length,
      teachersLoading,
      selectedIds: selectedIds.length
    });
  }, [currentSchool, teachers, teachersLoading, selectedIds]);

  const handleBulkArchive = async () => {
    try {
      await bulkArchive(selectedIds);
      toast({
        title: "Turmas arquivadas",
        description: `${selectedIds.length} turma(s) foram arquivadas com sucesso.`,
      });
      onComplete();
      setShowArchiveConfirm(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar as turmas.",
        variant: "destructive",
      });
    }
  };

  const handleBulkAssignTeacher = async () => {
    if (!selectedTeacher) {
      toast({
        title: "Selecione um professor",
        description: "É necessário selecionar um professor para atribuir.",
        variant: "destructive",
      });
      return;
    }

    try {
      await bulkAssignTeacher(selectedIds, selectedTeacher);
      const teacher = teachers.find(t => t.id === selectedTeacher);
      toast({
        title: "Professor atribuído",
        description: `${teacher?.name} foi atribuído a ${selectedIds.length} turma(s).`,
      });
      onComplete();
      setSelectedTeacher('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o professor.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="glass-card p-4 border border-primary/30">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedIds.length} turma(s) selecionada(s)
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Bulk Archive */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchiveConfirm(true)}
            className="glass-button"
          >
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </Button>

          {/* Bulk Assign Teacher */}
          <div className="flex items-center space-x-2">
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-48 glass-input">
                <SelectValue placeholder={
                  teachersLoading 
                    ? "Carregando professores..." 
                    : teachers.length === 0
                    ? "Nenhum professor disponível"
                    : "Selecionar professor"
                } />
              </SelectTrigger>
              <SelectContent className="glass-card">
                {teachers.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {!currentSchool 
                      ? '⚠️ Nenhuma escola selecionada'
                      : 'Nenhum professor cadastrado nesta escola.'
                    }
                  </div>
                ) : (
                  teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            <Button
              size="sm"
              onClick={handleBulkAssignTeacher}
              disabled={!selectedTeacher || teachersLoading}
              className="glass-button"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {teachersLoading ? 'Carregando...' : 'Atribuir'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Arquivar Turmas"
        description={`Tem certeza que deseja arquivar ${selectedIds.length} turma(s)? Turmas arquivadas não aparecem em seleções de audiência.`}
        confirmText="Arquivar"
        onConfirm={handleBulkArchive}
      />
    </div>
  );
}