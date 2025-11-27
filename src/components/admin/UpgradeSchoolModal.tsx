import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Plus, Rocket, CheckCircle2, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

interface UpgradeSchoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeSchoolModal({ open, onOpenChange }: UpgradeSchoolModalProps) {
  const { limits, nextPlan } = useSubscription();
  const { toast } = useToast();

  const handleAddSchool = () => {
    toast({
      title: "Função em desenvolvimento",
      description: "Entre em contato para adicionar uma nova escola ao seu plano.",
    });
  };

  const handleUpgrade = () => {
    toast({
      title: "Função em desenvolvimento",
      description: "Entre em contato para fazer upgrade do seu plano.",
    });
  };

  const usagePercentage = limits 
    ? Math.round((limits.current_schools / limits.max_schools) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] glass-card p-0 overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 p-6 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl gradient-text">
                  Limite de Escolas Atingido
                </DialogTitle>
                <DialogDescription className="text-base">
                  Seu plano permite até {limits?.max_schools || 0} escolas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Informação do Plano Atual */}
          <Card className="glass-card p-4 border-primary/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Plano Atual: {limits?.plan_name || 'Carregando...'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {limits?.current_students || 0} de {limits?.max_students || 0} alunos utilizados
                  </p>
                </div>
                <Badge variant="outline" className="border-primary text-primary">
                  Ativo
                </Badge>
              </div>
              
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Escolas utilizadas</span>
                  <span className="font-semibold">{limits?.current_schools || 0}/{limits?.max_schools || 0}</span>
                </div>
                <Progress 
                  value={usagePercentage} 
                  className={`h-2 ${usagePercentage >= 100 ? '[&>[data-role=indicator]]:bg-destructive' : ''}`}
                />
              </div>
            </div>
          </Card>

          {/* Opções de Upgrade */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Card A: Adicionar Escola */}
            <Card className="glass-card p-6 border-primary/50 hover:border-primary transition-all relative overflow-hidden group">
              <Badge className="absolute top-4 right-4 bg-primary/20 text-primary border-primary/50">
                Mais popular
              </Badge>
              
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold mb-1">Adicionar Unidade</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-primary">+R$ 99,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Compartilha a mesma capacidade de {limits?.max_students || 0} alunos
                  </p>
                </div>

                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>+1 escola adicional</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Capacidade de alunos compartilhada</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Todas as funcionalidades do plano atual</span>
                  </li>
                </ul>

                <Button 
                  onClick={handleAddSchool}
                  className="w-full glass-button group-hover:bg-primary/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Escola
                </Button>
              </div>
            </Card>

            {/* Card B: Upgrade de Plano */}
            {nextPlan && (
              <Card className="glass-card p-6 border-accent/50 hover:border-accent transition-all group">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mb-2">
                    <Rocket className="h-6 w-6 text-accent" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold mb-1">Upgrade: {nextPlan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-accent">
                        R$ {(nextPlan.price_cents / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {nextPlan.max_students} alunos + {nextPlan.included_schools} escolas incluídas
                    </p>
                  </div>

                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>{nextPlan.max_students} alunos (vs {limits?.max_students || 0} atual)</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>{nextPlan.included_schools} escolas incluídas</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Mais capacidade para crescer</span>
                    </li>
                  </ul>

                  <Button 
                    onClick={handleUpgrade}
                    className="w-full glass-button bg-accent/20 hover:bg-accent/30 border-accent/50"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <Button 
              variant="link" 
              className="text-sm text-muted-foreground hover:text-primary p-0"
              onClick={() => {
                toast({
                  title: "Ver todos os planos",
                  description: "Entre em contato para conhecer todos os planos disponíveis.",
                });
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver todos os planos
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="glass-button"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
