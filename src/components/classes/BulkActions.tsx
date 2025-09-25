import { useState } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
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
  const { getTeachers } = usePeopleStore();
  
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  const teachers = getTeachers();

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
                <SelectValue placeholder="Selecionar professor" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                {teachers.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              size="sm"
              onClick={handleBulkAssignTeacher}
              disabled={!selectedTeacher}
              className="glass-button"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir
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