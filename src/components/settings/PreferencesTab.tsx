import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPreferences } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Save, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BlockedSetting } from '@/components/ui/blocked-setting';
import { isFeatureEnabled, trackBlockedFeatureView } from '@/lib/feature-flags';

export function PreferencesTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [preferences, setPreferences] = useState<UserPreferences['ui']>(user?.preferences.ui || {
    theme: 'dark' as const,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
  });

  const handleThemeToggle = () => {
    setPreferences(prev => ({ 
      ...prev, 
      theme: prev.theme === 'dark' ? 'light' as const : 'dark' as const
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser({
        preferences: {
          ...user?.preferences,
          ui: preferences,
        },
      });

      toast({
        title: 'Sucesso',
        description: 'Preferências salvas com sucesso!',
      });

      // In a real app, you might want to apply theme changes immediately
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar preferências. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Customize a aparência da interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isFeatureEnabled('THEME_SWITCH_ENABLED') ? (
            <BlockedSetting
              title="Tema Escuro"
              description="Interface mantém tema atual (escuro)"
              icon={<Moon className="h-4 w-4 text-muted-foreground" />}
              type="switch"
              learnMoreContent={
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    A troca de temas estará disponível em breve e incluirá:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Tema claro e escuro</li>
                    <li>• Modo automático baseado no sistema</li>
                    <li>• Temas personalizados por escola</li>
                    <li>• Sincronização entre dispositivos</li>
                  </ul>
                </div>
              }
              onClick={() => trackBlockedFeatureView('theme_switch')}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {preferences.theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="theme-toggle">Tema Escuro</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {preferences.theme === 'dark' 
                    ? 'Interface com cores escuras (ativo)'
                    : 'Interface com cores claras (inativo)'
                  }
                </p>
              </div>
              <Switch
                id="theme-toggle"
                checked={preferences.theme === 'dark'}
                onCheckedChange={handleThemeToggle}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </div>
    </div>
  );
}
