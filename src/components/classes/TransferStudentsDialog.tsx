import { useState } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransferStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromClassId: string;
  studentIds: string[];
  onComplete: () => void;
}

export function TransferStudentsDialog({
  open,
  onOpenChange,
  fromClassId,
  studentIds,
  onComplete
}: TransferStudentsDialogProps) {
  const { toast } = useToast();
  const { getActiveClasses, transferStudents } = useClassStore();
  const { getPerson } = usePeopleStore();
  
  const [targetClassId, setTargetClassId] = useState('');

  const activeClasses = getActiveClasses().filter(c => c.id !== fromClassId);
  const students = studentIds.map(id => getPerson(id)).filter(Boolean);

  const handleTransfer = async () => {
    if (!targetClassId) {
      toast({
        title: "Selecione uma turma",
        description: "É necessário selecionar uma turma de destino.",
        variant: "destructive",
      });
      return;
    }

    try {
      await transferStudents(fromClassId, targetClassId, studentIds);
      
      const targetClass = activeClasses.find(c => c.id === targetClassId);
      toast({
        title: "Alunos transferidos",
        description: `${students.length} aluno(s) foram transferidos para ${targetClass?.name}.`,
      });
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível transferir os alunos.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="gradient-text flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Alunos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Students */}
          <div>
            <label className="text-sm font-medium">
              Alunos Selecionados ({students.length})
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {students.map(student => (
                <Badge key={student.id} variant="secondary">
                  {student.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Class Selection */}
          <div>
            <label className="text-sm font-medium">Turma de Destino</label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger className="mt-2 glass-input">
                <SelectValue placeholder="Selecione uma turma ativa" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                {activeClasses.map(schoolClass => (
                  <SelectItem key={schoolClass.id} value={schoolClass.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{schoolClass.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {schoolClass.students.length} alunos
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeClasses.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Nenhuma turma ativa disponível para transferência.
              </p>
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
            <Button 
              onClick={handleTransfer}
              disabled={!targetClassId || activeClasses.length === 0}
              className="glass-button"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}