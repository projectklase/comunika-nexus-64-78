import { useState } from 'react';
import { ActivityDraft, DraftService } from '@/services/teacher-prefs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface DraftModalProps {
  userId: string;
  onLoadDraft: (draft: ActivityDraft) => void;
}

const typeLabels = {
  ATIVIDADE: 'Atividade',
  TRABALHO: 'Trabalho', 
  PROVA: 'Prova'
};

const typeColors = {
  ATIVIDADE: 'bg-blue-500',
  TRABALHO: 'bg-orange-500',
  PROVA: 'bg-red-500'
};

export function DraftModal({ userId, onLoadDraft }: DraftModalProps) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<ActivityDraft[]>([]);
  const { toast } = useToast();

  const loadDrafts = () => {
    const userDrafts = DraftService.getDrafts(userId);
    setDrafts(userDrafts);
  };

  const handleLoadDraft = (draft: ActivityDraft) => {
    onLoadDraft(draft);
    setOpen(false);
    toast({
      title: 'Rascunho carregado',
      description: 'O formulário foi preenchido com o rascunho salvo.'
    });
  };

  const handleDeleteDraft = (draftId: string) => {
    DraftService.deleteDraft(userId, draftId);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    toast({
      title: 'Rascunho excluído',
      description: 'O rascunho foi removido.'
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadDrafts();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Rascunhos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rascunhos Salvos</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          {drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum rascunho encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`text-white ${typeColors[draft.type]}`}>
                      {typeLabels[draft.type]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <h4 className="font-medium text-sm mb-1 line-clamp-1">
                    {draft.title || 'Sem título'}
                  </h4>
                  
                  <div className="flex items-center text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>
                      {format(new Date(draft.savedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleLoadDraft(draft)}
                  >
                    Carregar Rascunho
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}