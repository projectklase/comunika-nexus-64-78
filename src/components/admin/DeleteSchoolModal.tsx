import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { School } from '@/types/school';
import { useSchools } from '@/hooks/useSchools';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DeleteSchoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: School | null;
  onSuccess: () => void;
}

export function DeleteSchoolModal({ open, onOpenChange, school, onSuccess }: DeleteSchoolModalProps) {
  const { getSchoolStats, deleteSchool } = useSchools();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSecretarias: 0
  });

  useEffect(() => {
    if (open && school) {
      setConfirmName('');
      loadStats();
    }
  }, [open, school]);

  const loadStats = async () => {
    if (!school) return;
    
    setIsLoadingStats(true);
    try {
      const schoolStats = await getSchoolStats(school.id);
      setStats(schoolStats);
    } catch (error) {
      console.error('Error loading school stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleDelete = async () => {
    if (!school || confirmName !== school.name) return;

    setIsLoading(true);
    try {
      await deleteSchool(school.id);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting school:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isConfirmValid = confirmName === school?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-[500px] border-2 border-destructive/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            EXCLUIR ESCOLA
          </DialogTitle>
          <DialogDescription className="text-base font-semibold">
            Esta ação é IRREVERSÍVEL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está prestes a excluir:
          </p>

          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏫</span>
                <span className="font-bold text-lg">{school?.name}</span>
              </div>

              {isLoadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>•</span>
                    <span>
                      {stats.totalStudents} {stats.totalStudents === 1 ? 'aluno será desvinculado' : 'alunos serão desvinculados'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>•</span>
                    <span>
                      {stats.totalTeachers} {stats.totalTeachers === 1 ? 'professor será desvinculado' : 'professores serão desvinculados'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>•</span>
                    <span>
                      {stats.totalSecretarias} {stats.totalSecretarias === 1 ? 'secretária será desvinculada' : 'secretárias serão desvinculadas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>•</span>
                    <span>
                      {stats.totalClasses} {stats.totalClasses === 1 ? 'turma será arquivada' : 'turmas serão arquivadas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>•</span>
                    <span>Todo histórico será perdido</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-destructive font-semibold">
              ⚠️ Para confirmar, digite o nome exato:
            </Label>
            <p className="text-sm font-mono bg-background/50 p-2 rounded border border-border">
              "{school?.name}"
            </p>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Digite o nome da escola"
              className="glass-input border-destructive/50"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isLoading || !isConfirmValid}
              variant="destructive"
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              🗑️ Excluir Escola
            </Button>
          </div>

          {!isConfirmValid && confirmName && (
            <p className="text-xs text-center text-destructive">
              O nome não corresponde. Digite exatamente como mostrado acima.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
