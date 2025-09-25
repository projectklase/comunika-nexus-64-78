import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Save, Shield } from 'lucide-react';
import { useUserSettingsStore } from '@/stores/user-settings-store';
import { useToast } from '@/hooks/use-toast';

export function LoginPreferencesTab() {
  const { toast } = useToast();
  const { rememberEmail, lastEmail, updateSetting, setLastEmail } = useUserSettingsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [emailValue, setEmailValue] = useState(lastEmail);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLastEmail(emailValue);
      
      toast({
        title: 'Sucesso',
        description: 'Preferências de login salvas com sucesso!',
      });
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações de Login
          </CardTitle>
          <CardDescription>
            Configure suas preferências para facilitar o acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="remember-email">Lembrar E-mail</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Preencher automaticamente o e-mail no próximo login
              </p>
            </div>
            <Switch
              id="remember-email"
              checked={rememberEmail}
              onCheckedChange={(checked) => updateSetting('rememberEmail', checked)}
            />
          </div>

          {rememberEmail && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="saved-email">E-mail Salvo</Label>
              <Input
                id="saved-email"
                type="email"
                placeholder="Digite seu e-mail"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Este e-mail será preenchido automaticamente na tela de login
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}