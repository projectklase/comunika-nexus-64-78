import { Sparkles, Calendar, Target, Plus, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  variant: 'radar' | 'planner' | 'timeline' | 'suggestions';
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig = {
  radar: {
    icon: Target,
    title: 'Radar limpo',
    description: 'Nenhuma atividade urgente detectada no momento',
    suggestion: 'Que tal planejar algo novo?',
    actionLabel: 'Criar Atividade',
    gradient: 'from-green-500/10 via-green-500/5 to-transparent'
  },
  planner: {
    icon: Calendar,
    title: 'Nada planejado para hoje',
    description: 'Sua agenda está livre. Quer aceitar a semana sugerida?',
    suggestion: 'Use auto-sugestões para otimizar sua semana',
    actionLabel: 'Gerar Sugestões',
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent'
  },
  timeline: {
    icon: Calendar,
    title: 'Próximos 30 dias tranquilos',
    description: 'Não há atividades com prazo nos próximos dias',
    suggestion: 'Aproveite para se organizar',
    actionLabel: 'Ver Calendário',
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent'
  },
  suggestions: {
    icon: Sparkles,
    title: 'Pronto para sugestões?',
    description: 'O sistema analisará suas atividades e criará um plano otimizado',
    suggestion: 'Clique para gerar sugestões inteligentes',
    actionLabel: 'Gerar Sugestões',
    gradient: 'from-primary/10 via-primary/5 to-transparent'
  }
};

export function EmptyState({ variant, onAction, className }: EmptyStateProps) {
  const config = emptyStateConfig[variant];
  const Icon = config.icon;

  return (
    <Card className={cn("glass-card border-border/30", className)}>
      <CardContent className="p-8 text-center">
        <div className={cn(
          "w-full h-32 rounded-lg mb-6 flex items-center justify-center bg-gradient-to-br",
          config.gradient
        )}>
          <Icon className="h-12 w-12 text-muted-foreground/50" />
        </div>
        
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {config.description}
          </p>
          <p className="text-xs text-primary font-medium">
            {config.suggestion}
          </p>
        </div>
        
        {onAction && (
          <Button
            onClick={onAction}
            variant="outline"
            size="sm"
            className="glass-card hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            {config.actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized empty states
export function EmptyPlannerWeek({ onGenerateSuggestions }: { onGenerateSuggestions: () => void }) {
  return (
    <div className="space-y-4">
      <EmptyState
        variant="planner"
        onAction={onGenerateSuggestions}
        className="mb-4"
      />
      
      <Card className="glass-card border-border/30">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="text-sm font-medium text-foreground">
              Dicas para começar
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-md">
                <Plus className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">QuickAdd</div>
                  <div className="text-muted-foreground">Crie tarefas rapidamente</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-md">
                <Volume2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Comando de Voz</div>
                  <div className="text-muted-foreground">Use o microfone</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-md">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Auto-sugestões</div>
                  <div className="text-muted-foreground">IA organiza por você</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EmptyRadar({ onQuickAdd }: { onQuickAdd: () => void }) {
  return (
    <div className="space-y-4">
      <EmptyState
        variant="radar"
        onAction={onQuickAdd}
        className="mb-4"
      />
      
      {/* Achievement-like message */}
      <Card className="glass-card border-green-500/20 bg-green-500/5">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
            <Target className="h-4 w-4" />
            <span className="font-medium">Parabéns! Você está em dia com tudo</span>
          </div>
          <p className="text-xs text-green-600/80 mt-1">
            Continue assim e mantenha o foco
          </p>
        </CardContent>
      </Card>
    </div>
  );
}