import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { School } from '@/types/school';
import { useSchoolFeatures } from '@/hooks/useSchoolFeatures';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SchoolFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: School | null;
}

export function SchoolFeaturesModal({ open, onOpenChange, school }: SchoolFeaturesModalProps) {
  const { features, isLoading, toggleFeature, refetch } = useSchoolFeatures(school?.id);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && school) {
      refetch();
      setPendingChanges({});
    }
  }, [open, school, refetch]);

  const handleToggle = (featureKey: string, enabled: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [featureKey]: enabled
    }));
  };

  const handleSave = async () => {
    if (!school) return;

    setIsSaving(true);
    try {
      // Apply all pending changes
      for (const [key, enabled] of Object.entries(pendingChanges)) {
        await toggleFeature(key, enabled);
      }
      
      setPendingChanges({});
      
      // Toast de confirmação informando atualização automática
      toast({
        title: "✓ Configurações salvas",
        description: "A barra lateral será atualizada automaticamente em instantes.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving features:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFeatureEnabled = (key: string) => {
    return key in pendingChanges 
      ? pendingChanges[key]
      : features.find(f => f.key === key)?.enabled || false;
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            ⚙️ Configurar Funcionalidades
          </DialogTitle>
          <DialogDescription>
            {school?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </h3>
                
                <div className="space-y-2">
                  {categoryFeatures.map((feature) => {
                    const isEnabled = getFeatureEnabled(feature.key);
                    const hasChanged = feature.key in pendingChanges;
                    
                    return (
                      <Card 
                        key={feature.key}
                        className={`p-4 transition-all ${
                          hasChanged 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{feature.icon}</span>
                              <Label 
                                htmlFor={feature.key}
                                className="text-base font-semibold cursor-pointer"
                              >
                                {feature.label}
                              </Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>
                          
                          <Switch
                            id={feature.key}
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                            disabled={isSaving}
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Future features placeholder */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Em Breve
              </h3>
              
              <Card className="p-4 border-border/30 bg-background/30 opacity-60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">📧</span>
                      <Label className="text-base font-semibold">
                        Notificações por Email
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Em desenvolvimento...
                    </p>
                  </div>
                  
                  <Switch disabled checked={false} />
                </div>
              </Card>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="glass-button"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ✓ Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
