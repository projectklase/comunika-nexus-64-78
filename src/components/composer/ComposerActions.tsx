import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Send, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposerActionsProps {
  onCancel?: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  onPublish: () => void;
  canSchedule: boolean;
  canPublish: boolean;
  isLoading?: boolean;
  isEditing?: boolean;
  showScheduling?: boolean;
  className?: string;
}

export function ComposerActions({
  onCancel,
  onSaveDraft,
  onSchedule,
  onPublish,
  canSchedule,
  canPublish,
  isLoading = false,
  isEditing = false,
  showScheduling = true,
  className
}: ComposerActionsProps) {
  const publishLabel = isEditing ? 'Atualizar' : 'Publicar';
  const scheduleLabel = isEditing ? 'Reagendar' : 'Agendar';

  return (
    <div className={cn("flex flex-col gap-4 pt-6 border-t border-border/50", className)}>
      {/* Mobile layout - stacked */}
      <div className="flex flex-col gap-3 sm:hidden">
        {onCancel && (
          <Button 
            variant="ghost" 
            onClick={onCancel}
            disabled={isLoading}
            className="w-full justify-start"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        )}
        
        <Separator />
        
        <Button 
          variant="outline" 
          onClick={onSaveDraft}
          disabled={isLoading}
          className="w-full justify-start border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:border-foreground/20"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar como Rascunho
        </Button>
        
        {showScheduling && (
          <Button 
            variant="outline" 
            onClick={onSchedule}
            disabled={!canSchedule || isLoading}
            className="w-full justify-start border-secondary/50 text-secondary hover:bg-secondary/10 hover:border-secondary disabled:opacity-50"
          >
            <Clock className="h-4 w-4 mr-2" />
            {isLoading ? 'Processando...' : scheduleLabel}
          </Button>
        )}
        
        <Button 
          onClick={onPublish}
          disabled={!canPublish || isLoading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? 'Processando...' : publishLabel}
        </Button>
      </div>

      {/* Desktop layout - horizontal */}
      <div className="hidden sm:flex items-center justify-between">
        <div>
          {onCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onSaveDraft}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          
          {showScheduling && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Button 
                variant="outline" 
                onClick={onSchedule}
                disabled={!canSchedule || isLoading}
                className="border-secondary/50 text-secondary hover:bg-secondary/10 hover:border-secondary disabled:opacity-50"
              >
                <Clock className="h-4 w-4 mr-2" />
                {isLoading ? 'Processando...' : scheduleLabel}
              </Button>
            </>
          )}
          
          <Button 
            onClick={onPublish}
            disabled={!canPublish || isLoading}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Processando...' : publishLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}