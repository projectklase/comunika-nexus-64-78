import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Archive, Loader2, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { usePostCleanup } from '@/hooks/usePostCleanup';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeLabels: Record<string, string> = {
  EVENTO: 'Evento',
  ATIVIDADE: 'Atividade',
  TRABALHO: 'Trabalho',
  PROVA: 'Prova',
  AVISO: 'Aviso',
  COMUNICADO: 'Comunicado',
};

const typeColors: Record<string, string> = {
  EVENTO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ATIVIDADE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TRABALHO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PROVA: 'bg-red-500/20 text-red-400 border-red-500/30',
  AVISO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  COMUNICADO: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function CleanupPostsButton() {
  const [open, setOpen] = useState(false);
  const { isLoading, preview, fetchPreview, archiveExpiredPosts, clearPreview } = usePostCleanup();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchPreview();
    } else {
      clearPreview();
    }
  };

  const handleArchive = async () => {
    await archiveExpiredPosts();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Archive className="h-4 w-4" />
          Arquivar Posts Antigos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Arquivar Posts Expirados
          </DialogTitle>
          <DialogDescription>
            Posts expirados serão arquivados automaticamente. Isso libera espaço e mantém o feed limpo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : preview.length > 0 ? (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
              <p className="text-sm text-yellow-200">
                <strong>{preview.length}</strong> post{preview.length > 1 ? 's' : ''} será{preview.length > 1 ? 'ão' : ''} arquivado{preview.length > 1 ? 's' : ''}.
              </p>
            </div>

            <ScrollArea className="h-[250px] rounded-md border border-border/50">
              <div className="p-3 space-y-2">
                {preview.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-card/50 border border-border/30"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${typeColors[post.type] || ''}`}>
                          {typeLabels[post.type] || post.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(post.created_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Archive className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum post expirado encontrado.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Todos os posts estão atualizados!</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleArchive}
            disabled={isLoading || preview.length === 0}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Arquivar {preview.length > 0 ? `(${preview.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
