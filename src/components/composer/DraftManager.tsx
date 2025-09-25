import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Clock, 
  Trash2, 
  AlertCircle,
  Save
} from 'lucide-react';
import { DraftData } from '@/services/autosave-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DraftManagerProps {
  drafts: DraftData[];
  hasUnsavedChanges: boolean;
  onLoadDraft: (draft: DraftData) => void;
  onDeleteDraft: (draftId: string) => void;
  onSaveCurrentDraft: () => void;
  className?: string;
}

export function DraftManager({
  drafts,
  hasUnsavedChanges,
  onLoadDraft,
  onDeleteDraft,
  onSaveCurrentDraft,
  className
}: DraftManagerProps) {
  const { toast } = useToast();
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<DraftData | null>(null);

  const handleLoadDraft = (draft: DraftData) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        'Você tem alterações não salvas. Deseja carregar o rascunho mesmo assim?'
      );
      if (!confirm) return;
    }

    onLoadDraft(draft);
    setShowDrafts(false);
    
    toast({
      title: 'Rascunho carregado',
      description: `Rascunho "${draft.title || 'Sem título'}" foi carregado.`
    });
  };

  const handleDeleteDraft = (draft: DraftData) => {
    setDraftToDelete(draft);
  };

  const confirmDeleteDraft = () => {
    if (draftToDelete) {
      onDeleteDraft(draftToDelete.tempId);
      setDraftToDelete(null);
      
      toast({
        title: 'Rascunho removido',
        description: 'O rascunho foi removido com sucesso.'
      });
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'AVISO': '📢',
      'COMUNICADO': '📋',
      'EVENTO': '📅',
      'ATIVIDADE': '📝',
      'TRABALHO': '📄',
      'PROVA': '📊'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  if (drafts.length === 0 && !hasUnsavedChanges) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            Você tem alterações não salvas
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveCurrentDraft}
            className="h-7 text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            Salvar
          </Button>
        </div>
      )}

      {/* Drafts list */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Rascunhos</span>
              <Badge variant="secondary" className="text-xs">
                {drafts.length}
              </Badge>
            </div>
            
            {drafts.length > 3 && (
              <Dialog open={showDrafts} onOpenChange={setShowDrafts}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Rascunhos Salvos</DialogTitle>
                  </DialogHeader>
                  <DraftsList 
                    drafts={drafts}
                    onLoadDraft={handleLoadDraft}
                    onDeleteDraft={handleDeleteDraft}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Recent drafts preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {drafts.slice(0, 3).map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onLoad={() => handleLoadDraft(draft)}
                onDelete={() => handleDeleteDraft(draft)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!draftToDelete} onOpenChange={() => setDraftToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Rascunho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o rascunho "{draftToDelete?.title || 'Sem título'}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDraft}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DraftCard({ 
  draft, 
  onLoad, 
  onDelete 
}: { 
  draft: DraftData; 
  onLoad: () => void; 
  onDelete: () => void; 
}) {
  const getTypeIcon = (type: string) => {
    const icons = {
      'AVISO': '📢',
      'COMUNICADO': '📋',
      'EVENTO': '📅',
      'ATIVIDADE': '📝',
      'TRABALHO': '📄',
      'PROVA': '📊'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  return (
    <div className="p-3 border border-border/50 rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{getTypeIcon(draft.type)}</span>
          <Badge variant="outline" className="text-xs">
            {draft.type}
          </Badge>
          {draft.isFromDayFocus && (
            <Badge variant="secondary" className="text-xs">
              Dia em Foco
            </Badge>
          )}
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover rascunho</TooltipContent>
        </Tooltip>
      </div>

      <h4 className="font-medium text-sm line-clamp-1 mb-1">
        {draft.title || 'Sem título'}
      </h4>
      
      {draft.body && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {draft.body}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {format(new Date(draft.savedAt), 'dd/MM HH:mm', { locale: ptBR })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onLoad}
          className="h-6 text-xs"
        >
          Carregar
        </Button>
      </div>
    </div>
  );
}

function DraftsList({ 
  drafts, 
  onLoadDraft, 
  onDeleteDraft 
}: { 
  drafts: DraftData[]; 
  onLoadDraft: (draft: DraftData) => void; 
  onDeleteDraft: (draft: DraftData) => void; 
}) {
  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          onLoad={() => onLoadDraft(draft)}
          onDelete={() => onDeleteDraft(draft)}
        />
      ))}
    </div>
  );
}