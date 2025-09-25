import { Calendar, MousePointer2, MoveIcon } from 'lucide-react';

interface DragDropInstructionProps {
  role?: 'secretaria' | 'professor' | 'aluno';
}

export function DragDropInstruction({ role = 'secretaria' }: DragDropInstructionProps) {
  if (role === 'aluno') {
    return (
      <div className="bg-muted/30 border border-border/50 rounded-lg p-4 mt-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          <p>
            <strong>Dica:</strong> Clique em qualquer dia para ver todas as atividades em detalhes. 
            Você pode navegar entre os dias para organizar melhor seu cronograma de estudos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-primary/20 rounded-lg p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <MoveIcon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">Arrastar e soltar eventos</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            💡 <strong>Dica:</strong> Você pode arrastar eventos (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 mx-1">
              📅 EVENTO
            </span>
            ) para mover suas datas. Clique em qualquer dia para ver todos os eventos e atividades com opções de gerenciamento.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <MousePointer2 className="h-3 w-3" />
            <span>Clique e arraste para reorganizar • Mudanças são salvas automaticamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}