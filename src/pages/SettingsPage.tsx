import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { SecurityTab } from '@/components/settings/SecurityTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { LoginPreferencesTab } from '@/components/settings/LoginPreferencesTab';
import { SchoolEvaluationTab } from '@/components/settings/SchoolEvaluationTab';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, Shield, Bell, LogIn } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  const canAccessSchoolSettings = user?.role === 'secretaria';

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações de conta
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${canAccessSchoolSettings ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="login" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferências
          </TabsTrigger>
          {canAccessSchoolSettings && (
            <TabsTrigger value="school" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Escola
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Gerencie suas informações pessoais e configurações de conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança da Conta
              </CardTitle>
              <CardDescription>
                {user?.role === 'aluno' 
                  ? 'Gerencie a segurança da sua conta'
                  : 'Altere sua senha e gerencie a segurança da sua conta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SecurityTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Configurações de Login
              </CardTitle>
              <CardDescription>
                Configure suas preferências de acesso e autenticação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginPreferencesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações de Notificação
              </CardTitle>
              <CardDescription>
                Configure como e quando você recebe notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferências do Sistema
              </CardTitle>
              <CardDescription>
                Personalize a interface e configurações de exibição
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesTab />
            </CardContent>
          </Card>
        </TabsContent>

        {canAccessSchoolSettings && (
          <TabsContent value="school">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações da Escola
                </CardTitle>
                <CardDescription>
                  Configure as opções gerais da escola
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolEvaluationTab />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}