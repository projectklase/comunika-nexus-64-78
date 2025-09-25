import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Plus } from 'lucide-react';

interface ScheduledEmptyStateProps {
  onCreatePost: () => void;
  userName?: string;
}

export function ScheduledEmptyState({ onCreatePost, userName }: ScheduledEmptyStateProps) {
  return (
    <Card className="glass-card border-border/50 bg-gradient-to-br from-background/50 to-muted/20">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Nenhuma publicação agendada</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {userName ? `${userName}, você` : 'Você'} não tem publicações agendadas no momento. 
            Que tal agendar uma nova publicação?
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={onCreatePost}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Publicação
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {
              // Pre-select tomorrow's date in composer
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              onCreatePost();
            }}
            className="border-border/50 hover:bg-muted/20"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Agendar para Amanhã
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground/60 space-y-1">
          <p>💡 Dica: Use Ctrl+S para salvar rascunhos rapidamente</p>
          <p>⚡ Atalho: Pressione 'A' para alternar o filtro Agendados</p>
        </div>
      </CardContent>
    </Card>
  );
}