import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSchoolSettingsStore } from '@/stores/school-settings-store';
import { useEffect, useState } from 'react';
import { Scale, GraduationCap } from 'lucide-react';

export function SchoolEvaluationTab() {
  const { getCurrentSchoolSettings, updateCurrentSchoolSettings, loadFromStorage } = useSchoolSettingsStore();
  const [weightsEnabled, setWeightsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar configurações do storage
    loadFromStorage();
    
    const settings = getCurrentSchoolSettings();
    if (settings) {
      setWeightsEnabled(settings.weightsEnabled);
    }
    
    setLoading(false);
  }, [getCurrentSchoolSettings, loadFromStorage]);

  const handleWeightsToggle = (enabled: boolean) => {
    setWeightsEnabled(enabled);
    updateCurrentSchoolSettings({ weightsEnabled: enabled });
    
    // Feedback visual
    if (enabled) {
      console.log('✅ Peso em atividades habilitado para toda a escola');
    } else {
      console.log('❌ Peso em atividades desabilitado para toda a escola');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configurações de Avaliação</h3>
        <p className="text-sm text-muted-foreground">
          Configure como as avaliações funcionam em toda a escola
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Sistema de Pesos
          </CardTitle>
          <CardDescription>
            Configure se professores podem usar pesos nas atividades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weights-enabled" className="text-base">
                Usar peso nas atividades
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite que professores atribuam pesos diferentes às atividades
              </p>
            </div>
            <Switch
              id="weights-enabled"
              checked={weightsEnabled}
              onCheckedChange={handleWeightsToggle}
            />
          </div>

          {weightsEnabled ? (
            <div className="rounded-lg bg-primary/10 p-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    Sistema de pesos ativo
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Professores podem configurar pesos para atividades, trabalhos e provas.
                    Campos de peso aparecerão nas telas de criação de atividades.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Sistema de pesos desativado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Campos de peso ficarão ocultos em todas as telas de atividades.
                    Dados já salvos serão preservados caso você reative esta função.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outras Configurações</CardTitle>
          <CardDescription>
            Configurações adicionais de avaliação (em desenvolvimento)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Mais opções de configuração serão adicionadas em futuras versões.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}