import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Users, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Guardian } from '@/hooks/useDuplicateCheck';

interface ExistingStudent {
  id: string;
  name: string;
  email: string;
  guardians?: Guardian[];
}

interface SiblingGuardianSuggestionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similarStudents: ExistingStudent[];
  onCopyGuardians: (guardians: Guardian[]) => void;
}

export function SiblingGuardianSuggestion({
  open,
  onOpenChange,
  similarStudents,
  onCopyGuardians,
}: SiblingGuardianSuggestionProps) {
  const studentsWithGuardians = similarStudents.filter(s => s.guardians && s.guardians.length > 0);

  if (studentsWithGuardians.length === 0) {
    return null;
  }

  const handleCopyGuardians = (guardians: Guardian[]) => {
    // Remove IDs para criar novos registros
    const newGuardians = guardians.map(g => ({
      ...g,
      id: undefined,
    }));
    onCopyGuardians(newGuardians);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto backdrop-blur-xl bg-background/95 border border-white/20">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Possível Irmão Detectado</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Encontramos aluno(s) com telefone/endereço similar. Deseja copiar os responsáveis?
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {studentsWithGuardians.map((student) => (
            <div
              key={student.id}
              className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-all"
            >
              {/* Header do Aluno */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/50">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Possível Irmão
                </Badge>
              </div>

              {/* Lista de Responsáveis */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Responsáveis Cadastrados ({student.guardians?.length || 0}):
                </p>
                {student.guardians?.map((guardian, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border/30"
                  >
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="bg-muted text-xs">
                        {guardian.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{guardian.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {guardian.relation}
                        </Badge>
                        {guardian.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {guardian.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{guardian.phone}</span>
                          </div>
                        )}
                        {guardian.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{guardian.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão de Ação */}
              <Button
                onClick={() => handleCopyGuardians(student.guardians || [])}
                className="w-full mt-3"
                variant="default"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Responsáveis
              </Button>
            </div>
          ))}
        </div>

        {/* Aviso de Segurança */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Aviso Importante</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique se os responsáveis sugeridos são realmente os mesmos antes de copiar.
              Você pode editar os dados após a cópia, se necessário.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Preencher Manualmente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
