import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Users, BookOpen } from 'lucide-react';

interface AffectedClass {
  id: string;
  name: string;
  studentCount: number;
}

interface RemoveSchoolWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherName: string;
  schoolName: string;
  affectedClasses: AffectedClass[];
  totalClasses: number;
  totalStudents: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function RemoveSchoolWarningModal({
  open,
  onOpenChange,
  teacherName,
  schoolName,
  affectedClasses,
  totalClasses,
  totalStudents,
  onConfirm,
  onCancel,
  loading = false
}: RemoveSchoolWarningModalProps) {
  const [confirmationText, setConfirmationText] = useState('');

  const isConfirmationValid = confirmationText.trim().toLowerCase() === teacherName.trim().toLowerCase();

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
      setConfirmationText(''); // Reset após confirmação
    }
  };

  const handleCancel = () => {
    setConfirmationText(''); // Reset ao cancelar
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] border-destructive/50 bg-background/95 backdrop-blur-md"
        onPointerDownOutside={loading ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={loading ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6" />
            Atenção: Remoção de Acesso
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Você está prestes a remover <span className="font-semibold text-foreground">{teacherName}</span> da escola{' '}
            <span className="font-semibold text-foreground">{schoolName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Turmas Afetadas */}
          {affectedClasses.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>TURMAS AFETADAS:</span>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {affectedClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{classItem.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classItem.studentCount} {classItem.studentCount === 1 ? 'aluno' : 'alunos'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-destructive/20 flex items-center justify-between text-sm font-semibold">
                <span>Total:</span>
                <span>
                  {totalClasses} {totalClasses === 1 ? 'turma' : 'turmas'}, {totalStudents} {totalStudents === 1 ? 'aluno' : 'alunos'}
                </span>
              </div>

              <div className="pt-2 text-sm text-destructive font-medium bg-destructive/10 rounded-md p-3 border border-destructive/20">
                ⚠️ As turmas acima ficarão <span className="font-bold">SEM PROFESSOR PRINCIPAL</span> após esta ação!
              </div>
            </div>
          )}

          {/* Mensagem quando não há turmas */}
          {affectedClasses.length === 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>Atenção</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Este professor não possui turmas ativas nesta escola, mas a remoção ainda precisa ser confirmada.
              </p>
            </div>
          )}

          {/* Campo de Confirmação */}
          <div className="space-y-3 pt-4">
            <Label htmlFor="confirmation" className="text-base font-semibold">
              Para confirmar, digite o nome do professor:
            </Label>
            <Input
              id="confirmation"
              type="text"
              placeholder={`Digite: "${teacherName}"`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={loading}
              className={`${
                confirmationText && !isConfirmationValid
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-destructive">
                O nome digitado não corresponde. Verifique a ortografia.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || loading}
          >
            {loading ? 'Processando...' : 'Confirmar Remoção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
