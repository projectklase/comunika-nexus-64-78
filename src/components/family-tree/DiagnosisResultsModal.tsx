import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Info, AlertCircle, Lightbulb, X, Users, Shield, Clock } from 'lucide-react';
import { type DiagnosisResult } from '@/utils/diagnose-family-relationships';
import { RELATIONSHIP_LABELS } from '@/types/family-metrics';

interface DiagnosisResultsModalProps {
  open: boolean;
  onClose: () => void;
  results: DiagnosisResult | null;
}

const severityConfig = {
  CRITICAL: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'CRÍTICO',
    description: 'Requer correção imediata'
  },
  HIGH: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'ALTO',
    description: 'Recomenda-se correção'
  },
  MEDIUM: {
    icon: Info,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'MÉDIO',
    description: 'Revisar quando possível'
  },
  LOW: {
    icon: Lightbulb,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'BAIXO',
    description: 'Informativo'
  }
};

export function DiagnosisResultsModal({ open, onClose, results }: DiagnosisResultsModalProps) {
  if (!results) return null;

  const hasIssues = results.totalIssues > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] glass-card border-border/50">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                Diagnóstico de Relacionamentos Familiares
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Gerado em {new Date(results.timestamp).toLocaleString('pt-BR')}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Resumo Executivo */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-foreground">{results.totalIssues}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-2xl font-bold text-red-500">{results.criticalIssues}</div>
              <div className="text-xs text-red-500/80 mt-1">Críticas</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="text-2xl font-bold text-orange-500">{results.highIssues}</div>
              <div className="text-xs text-orange-500/80 mt-1">Altas</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-500">{results.mediumIssues}</div>
              <div className="text-xs text-yellow-500/80 mt-1">Médias</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-500">{results.lowIssues}</div>
              <div className="text-xs text-blue-500/80 mt-1">Baixas</div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Resultados */}
        <ScrollArea className="h-[50vh] pr-4">
          {!hasIssues ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  ✅ Nenhuma inconsistência detectada!
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Todos os relacionamentos familiares cadastrados estão consistentes com os dados de guardians compartilhados.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {results.issues.map((issue, index) => {
                const config = severityConfig[issue.severity];
                const Icon = config.icon;

                return (
                  <Alert
                    key={issue.id}
                    className={`${config.bgColor} border ${config.borderColor}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 ${config.color} mt-0.5 shrink-0`} />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <AlertTitle className="text-base font-semibold text-foreground mb-1">
                            {issue.student1Name} ↔ {issue.student2Name}
                          </AlertTitle>
                          <Badge variant="outline" className={`${config.color} shrink-0`}>
                            {config.label}
                          </Badge>
                        </div>

                        <AlertDescription className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground">Cadastrado como:</span>
                            <Badge variant="secondary" className="bg-muted">
                              {RELATIONSHIP_LABELS[issue.currentRelationship as keyof typeof RELATIONSHIP_LABELS] || issue.currentRelationship}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-muted-foreground">Deveria ser:</span>
                            <Badge variant="default" className={config.color}>
                              {RELATIONSHIP_LABELS[issue.expectedRelationship as keyof typeof RELATIONSHIP_LABELS] || issue.expectedRelationship}
                            </Badge>
                          </div>

                          <div className="text-muted-foreground">
                            <strong>Motivo:</strong> {issue.reason}
                          </div>

                          {issue.guardianEvidence && (
                            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-muted/50 text-xs">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Evidência: {issue.guardianEvidence.guardianName} ({issue.guardianEvidence.guardianRole})
                              </span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                Confiança: {issue.confidence}
                              </Badge>
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {hasIssues && (
            <Button
              variant="default"
              className="bg-gradient-to-r from-primary to-primary/80"
              onClick={() => {
                // TODO: Implementar correção automática (Fase 4)
                alert('Correção automática será implementada na Fase 4');
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Corrigir Automaticamente
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
