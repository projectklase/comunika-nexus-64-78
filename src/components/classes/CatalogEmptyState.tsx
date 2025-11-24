import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, BookOpen } from 'lucide-react';
import { MissingCatalog } from '@/utils/catalog-guards';

interface CatalogEmptyStateProps {
  missingCatalogs: MissingCatalog[];
  onCreateLevel?: () => void;
  onCreateModality?: () => void;
  onCreateSubject?: () => void;
  onOpenGlobalCatalog?: () => void;
}

export function CatalogEmptyState({ 
  missingCatalogs, 
  onCreateLevel,
  onCreateModality,
  onCreateSubject,
  onOpenGlobalCatalog 
}: CatalogEmptyStateProps) {
  if (missingCatalogs.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'level': return '📚';
      case 'modality': return '🎯';
      case 'subject': return '📖';
      default: return '📋';
    }
  };

  const getHandler = (type: string) => {
    switch (type) {
      case 'level': return onCreateLevel;
      case 'modality': return onCreateModality;
      case 'subject': return onCreateSubject;
      default: return undefined;
    }
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/5">
      <CardContent className="flex flex-col items-center justify-center py-8 px-6 text-center">
        <div className="mb-4 p-3 bg-muted/20 rounded-full">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Cadastre os pré-requisitos
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Antes de criar turmas, você precisa cadastrar os itens abaixo:
        </p>

        <div className="space-y-3 w-full max-w-md mb-6">
          {missingCatalogs.map((catalog) => (
            <div key={catalog.type} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getIcon(catalog.type)}</span>
                <div className="text-left">
                  <div className="font-medium text-sm">{catalog.label}</div>
                  <div className="text-xs text-muted-foreground">{catalog.description}</div>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={getHandler(catalog.type)}
                className="ml-2 h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                Criar
              </Button>
            </div>
          ))}
        </div>

        {onOpenGlobalCatalog && (
          <div className="pt-2 border-t border-border/50 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenGlobalCatalog}
              className="text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Abrir Catálogo Global
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}