import { X, Mail, Phone, Users, Link2, ChevronLeft, ChevronRight, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useModalKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface SelectedFamily {
  guardianId: string;
  guardianName: string;
  guardianEmail?: string;
  guardianPhone?: string;
  students: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  relationshipsCount: number;
}

interface FamilyDetailsSidebarProps {
  selectedFamily: SelectedFamily | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  totalFamilies: number;
  onEditStudent?: (studentId: string) => void;
}

export function FamilyDetailsSidebar({
  selectedFamily,
  onClose,
  onNext,
  onPrevious,
  totalFamilies,
  onEditStudent,
}: FamilyDetailsSidebarProps) {
  // ✅ Atalhos de teclado (Fase 4.2): ESC fecha, ← e → navegam
  useModalKeyboardShortcuts(!!selectedFamily, onClose, [
    {
      key: 'ArrowLeft',
      action: onPrevious,
      description: 'Família Anterior (←)',
      disabled: false
    },
    {
      key: 'ArrowRight',
      action: onNext,
      description: 'Próxima Família (→)',
      disabled: false
    }
  ]);

  if (!selectedFamily) return null;

  return (
    <>
      {/* ✅ Overlay para fechar ao clicar fora (Fase 4.2) */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
        aria-label="Fechar sidebar"
      />
      
      {/* Sidebar */}
      <div 
        data-family-sidebar
        className="absolute right-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 animate-slide-in-right overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header com controles */}
      <div className="sticky top-0 bg-gradient-to-br from-primary/10 to-background border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            FAMÍLIA EM FOCO
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-destructive/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navegação entre famílias */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            className="flex-1 h-8"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            className="flex-1 h-8"
          >
            Próxima
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            title="Resetar zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Informações do responsável */}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Responsável</p>
          <h3 className="text-lg font-bold text-foreground">{selectedFamily.guardianName}</h3>
        </div>

        {/* Contatos */}
        {(selectedFamily.guardianEmail || selectedFamily.guardianPhone) && (
          <div className="space-y-2">
            {selectedFamily.guardianEmail && (
              <div className="flex items-start gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-foreground break-all">{selectedFamily.guardianEmail}</span>
              </div>
            )}
            {selectedFamily.guardianPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{selectedFamily.guardianPhone}</span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Alunos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Alunos ({selectedFamily.students.length})
            </p>
          </div>

          <div className="space-y-2">
            {selectedFamily.students.map((student) => {
              const initials = student.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={student.id}
                  className="group flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={student.avatar} alt={student.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {student.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Aluno</p>
                  </div>
                  {onEditStudent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onEditStudent(student.id)}
                      title="Editar aluno"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Estatísticas */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Estatísticas</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Total de Alunos</p>
              <p className="text-2xl font-bold text-primary">{selectedFamily.students.length}</p>
            </div>
            
            <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 rounded-lg p-3 border border-chart-3/20">
              <div className="flex items-center gap-1 mb-1">
                <Link2 className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Relações</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {selectedFamily.relationshipsCount}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Clique em outra família para trocar o foco
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
