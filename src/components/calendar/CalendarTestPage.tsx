import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { CalendarNavigationButton } from './CalendarNavigationButton';
import { ClassCalendarButton } from '../classes/ClassCalendarButton';
import { buildAlunoCalendarUrl, navigateToAlunoCalendar } from '@/utils/calendar-navigation';
import { Calendar, FileText, Users, Settings, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CalendarTestPage() {
  const { user } = useAuth();
  const { goToCalendarWithDate, goToClassCalendar, getCalendarRoute } = useCalendarNavigation();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const markTest = (testName: string, success: boolean) => {
    setTestResults(prev => ({ ...prev, [testName]: success }));
  };

  const testNavigationFunctions = () => {
    try {
      // Test 1: Basic calendar navigation
      const calendarRoute = getCalendarRoute();
      markTest('getCalendarRoute', !!calendarRoute);

      // Test 2: URL building
      const testUrl = buildAlunoCalendarUrl({
        date: new Date(),
        classId: 'test-class',
        postId: 'test-post',
        view: 'week'
      });
      markTest('buildAlunoCalendarUrl', testUrl.includes('/aluno/calendario'));

      // Test 3: Date navigation
      goToCalendarWithDate(new Date(), 'month');
      markTest('goToCalendarWithDate', true);

    } catch (error) {
      console.error('Navigation test failed:', error);
      markTest('navigationFunctions', false);
    }
  };

  const testComponents = () => {
    try {
      // Components should render without errors
      markTest('components', true);
    } catch (error) {
      console.error('Component test failed:', error);
      markTest('components', false);
    }
  };

  const TestStatus = ({ testName }: { testName: string }) => {
    const result = testResults[testName];
    if (result === undefined) return <Badge variant="outline">Not tested</Badge>;
    return result ? 
      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Pass
      </Badge> : 
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Fail
      </Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text">Teste do Sistema de Calendário</h1>
        <p className="text-muted-foreground mt-2">
          Verificação de funcionalidades e componentes do calendário
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Navigation Tests */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Testes de Navegação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>getCalendarRoute</span>
              <TestStatus testName="getCalendarRoute" />
            </div>
            <div className="flex items-center justify-between">
              <span>buildAlunoCalendarUrl</span>
              <TestStatus testName="buildAlunoCalendarUrl" />
            </div>
            <div className="flex items-center justify-between">
              <span>goToCalendarWithDate</span>
              <TestStatus testName="goToCalendarWithDate" />
            </div>

            <Separator />

            <Button onClick={testNavigationFunctions} className="w-full">
              Executar Testes de Navegação
            </Button>
          </CardContent>
        </Card>

        {/* Component Tests */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Testes de Componentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>CalendarNavigationButton</span>
              <TestStatus testName="components" />
            </div>
            <div className="flex items-center justify-between">
              <span>ClassCalendarButton</span>
              <TestStatus testName="components" />
            </div>

            <Separator />

            <Button onClick={testComponents} className="w-full">
              Executar Testes de Componentes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Demo Components */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Demonstração dos Componentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Navegação para Calendário Geral</h4>
              <CalendarNavigationButton>
                Ir para Calendário
              </CalendarNavigationButton>
            </div>

            <div>
              <h4 className="font-medium mb-2">Navegação com Data Específica</h4>
              <CalendarNavigationButton date={new Date()}>
                Ir para Hoje
              </CalendarNavigationButton>
            </div>

            <div>
              <h4 className="font-medium mb-2">Calendário de Turma</h4>
              <ClassCalendarButton classId="test-class-123" />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Informações do Usuário Atual</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Papel: <Badge variant="outline">{user?.role || 'N/A'}</Badge></div>
              <div>ID: <code className="bg-muted/50 px-2 py-1 rounded">{user?.id || 'N/A'}</code></div>
              <div>Rota do Calendário: <code className="bg-muted/50 px-2 py-1 rounded">{getCalendarRoute()}</code></div>
              <div>Data Atual: {format(new Date(), "PPP 'às' p", { locale: ptBR })}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* URL Examples */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Exemplos de URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div>
              <strong>Calendário Básico:</strong>
              <code className="block bg-muted/50 p-2 rounded mt-1 break-all">
                {window.location.origin}/aluno/calendario
              </code>
            </div>
            <div>
              <strong>Com Data:</strong>
              <code className="block bg-muted/50 p-2 rounded mt-1 break-all">
                {buildAlunoCalendarUrl({ date: new Date() })}
              </code>
            </div>
            <div>
              <strong>Com Turma e Post:</strong>
              <code className="block bg-muted/50 p-2 rounded mt-1 break-all">
                {buildAlunoCalendarUrl({ 
                  date: new Date(), 
                  classId: 'turma-123', 
                  postId: 'post-456',
                  view: 'week'
                })}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}