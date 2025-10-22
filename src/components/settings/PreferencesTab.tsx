import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPreferences } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Palette, Globe, Clock, Calendar, Save, Monitor, Sun, Moon, Zap, Focus, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BlockedSetting } from '@/components/ui/blocked-setting';
import { isFeatureEnabled, trackBlockedFeatureView } from '@/lib/feature-flags';
import { useUserSettingsStore } from '@/stores/user-settings-store';

const languages = [
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español' },
];

const timezones = [
  { code: 'America/Sao_Paulo', name: 'São Paulo (UTC-3)' },
  { code: 'America/New_York', name: 'New York (UTC-5)' },
  { code: 'Europe/London', name: 'London (UTC+0)' },
  { code: 'Europe/Madrid', name: 'Madrid (UTC+1)' },
];

const dateFormats = [
  { code: 'DD/MM/YYYY', name: 'DD/MM/AAAA (31/12/2024)' },
  { code: 'MM/DD/YYYY', name: 'MM/DD/AAAA (12/31/2024)' },
  { code: 'YYYY-MM-DD', name: 'AAAA-MM-DD (2024-12-31)' },
];

export function PreferencesTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const {
    reduceMotion,
    calendarDensity,
    nexusPreferences,
    updateSetting,
    updateNexusPreference,
  } = useUserSettingsStore();
  
  const [preferences, setPreferences] = useState<UserPreferences['ui']>(user?.preferences.ui || {
    theme: 'dark' as const,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
  });

  const handleSelectChange = (key: keyof UserPreferences['ui'], value: string) => {
    if (key === 'theme') {
      setPreferences(prev => ({ ...prev, [key]: value as 'light' | 'dark' }));
    } else {
      setPreferences(prev => ({ ...prev, [key]: value }));
    }
  };

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

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localização
          </CardTitle>
          <CardDescription>
            Configure idioma e formatos regionais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isFeatureEnabled('I18N_ENABLED') ? (
            <>
              <BlockedSetting
                title="Idioma"
                description="Interface mantém idioma atual (português)"
                icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                type="select"
                placeholder="Português (Brasil)"
                learnMoreContent={
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      O suporte a múltiplos idiomas estará disponível em breve e incluirá:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Português, Inglês e Espanhol</li>
                      <li>• Tradução automática de conteúdo</li>
                      <li>• Formatação regional automática</li>
                      <li>• Detecção automática do idioma preferido</li>
                    </ul>
                  </div>
                }
                onClick={() => trackBlockedFeatureView('language_switch')}
              />
              
              <Separator />
              
              <BlockedSetting
                title="Fuso Horário"
                description="Horários mantêm configuração atual (São Paulo)"
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                type="select"
                placeholder="São Paulo (UTC-3)"
                onClick={() => trackBlockedFeatureView('timezone_switch')}
              />
              
              <Separator />
              
              <BlockedSetting
                title="Formato de Data"
                description="Datas mantêm formato atual (DD/MM/AAAA)"
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                type="select"
                placeholder="DD/MM/AAAA"
                onClick={() => trackBlockedFeatureView('date_format_switch')}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => handleSelectChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {language.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => handleSelectChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fuso horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((timezone) => (
                      <SelectItem key={timezone.code} value={timezone.code}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {timezone.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="date-format">Formato de Data</Label>
                <Select
                  value={preferences.dateFormat}
                  onValueChange={(value) => handleSelectChange('dateFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formato de data" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormats.map((format) => (
                      <SelectItem key={format.code} value={format.code}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Accessibility & Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Acessibilidade & Experiência
          </CardTitle>
          <CardDescription>
            Configure opções de acessibilidade e experiência de uso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="reduce-motion">Reduzir Animações</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Diminui ou remove animações para melhor performance
              </p>
            </div>
            <Switch
              id="reduce-motion"
              checked={reduceMotion}
              onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="calendar-density">Densidade do Calendário</Label>
            <Select
              value={calendarDensity}
              onValueChange={(value: 'compact' | 'comfortable' | 'spacious') => 
                updateSetting('calendarDensity', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Compacto - Mais informações por linha
                  </div>
                </SelectItem>
                <SelectItem value="comfortable">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Confortável - Equilíbrio ideal
                  </div>
                </SelectItem>
                <SelectItem value="spacious">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Espaçoso - Mais espaço entre elementos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Nexus Preferences - REMOVIDO */}
      {false && isFeatureEnabled('NEXUS_PREFS_ENABLED') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Focus className="h-5 w-5" />
              Preferências do Nexus
            </CardTitle>
            <CardDescription>
              Configure suas preferências de foco e estudo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="focus-duration">Duração Padrão de Foco (minutos)</Label>
              <Select
                value={nexusPreferences.defaultFocusDuration.toString()}
                onValueChange={(value) => 
                  updateNexusPreference('defaultFocusDuration', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="25">25 minutos (Pomodoro)</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Janelas de Estudo Preferidas</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="morning-window">Manhã (6h - 12h)</Label>
                  <p className="text-sm text-muted-foreground">
                    Período matutino para estudos
                  </p>
                </div>
                <Switch
                  id="morning-window"
                  checked={nexusPreferences.enableMorningWindow}
                  onCheckedChange={(checked) => updateNexusPreference('enableMorningWindow', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="afternoon-window">Tarde (12h - 18h)</Label>
                  <p className="text-sm text-muted-foreground">
                    Período vespertino para estudos
                  </p>
                </div>
                <Switch
                  id="afternoon-window"
                  checked={nexusPreferences.enableAfternoonWindow}
                  onCheckedChange={(checked) => updateNexusPreference('enableAfternoonWindow', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="evening-window">Noite (18h - 22h)</Label>
                  <p className="text-sm text-muted-foreground">
                    Período noturno para estudos
                  </p>
                </div>
                <Switch
                  id="evening-window"
                  checked={nexusPreferences.enableEveningWindow}
                  onCheckedChange={(checked) => updateNexusPreference('enableEveningWindow', checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="micro-breaks">Micro-pausas</Label>
                <p className="text-sm text-muted-foreground">
                  Pausas breves durante sessões longas de foco
                </p>
              </div>
              <Switch
                id="micro-breaks"
                checked={nexusPreferences.enableMicroBreaks}
                onCheckedChange={(checked) => updateNexusPreference('enableMicroBreaks', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

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