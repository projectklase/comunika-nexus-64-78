import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Brain,
  Sparkles,
  Package,
  Users,
  Calendar,
  Gift,
  Target,
  GraduationCap,
  Briefcase,
  Shield,
  Crown,
  History,
  BarChart,
  MessageCircle,
  Building2,
  Check,
  ArrowUpRight,
  Plus,
  Loader2,
  UsersRound,
  ExternalLink,
  Settings,
} from 'lucide-react';

const KLASE_FEATURES = [
  { icon: Brain, label: 'Inteligência Artificial' },
  { icon: Sparkles, label: 'Gamificação Completa' },
  { icon: Package, label: 'Jogo de Cartas Educacional' },
  { icon: Users, label: 'Gestão de Turmas e Alunos' },
  { icon: Calendar, label: 'Calendário de Eventos' },
  { icon: Gift, label: 'Sistema de Recompensas' },
  { icon: Target, label: 'Desafios Personalizados' },
  { icon: GraduationCap, label: 'Área Exclusiva para Alunos' },
  { icon: Briefcase, label: 'Área Exclusiva para Professores' },
  { icon: Shield, label: 'Área Exclusiva para Secretárias' },
  { icon: Crown, label: 'Área Exclusiva para Administradores' },
  { icon: History, label: 'Histórico Completo' },
  { icon: BarChart, label: 'Relatórios e Analytics' },
  { icon: MessageCircle, label: 'Suporte Prioritário' },
  { icon: UsersRound, label: 'Colaboradores Ilimitados' },
];

const PLAN_BADGES: Record<string, { color: string; icon: typeof Crown }> = {
  challenger: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Target },
  master: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Crown },
  legend: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Sparkles },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function AdminSubscriptionPage() {
  const { user } = useAuth();
  const { limits, isLoading, allPlans } = useSubscription();
  const { isLoading: isStripeLoading, createCheckout, openCustomerPortal } = useStripeSubscription();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Handle success/cancel URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Pagamento realizado!',
        description: 'Sua assinatura foi ativada com sucesso.',
      });
    } else if (searchParams.get('canceled') === 'true') {
      toast({
        title: 'Pagamento cancelado',
        description: 'O processo de pagamento foi cancelado.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const handleUpgrade = async (planSlug: string) => {
    await createCheckout(planSlug);
  };

  const handleAddSchool = async () => {
    await createCheckout('escola_extra');
  };

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const currentPlanSlug = limits?.plan_slug || 'challenger';
  const currentPlan = allPlans?.find(p => p.slug === currentPlanSlug);
  const planBadge = PLAN_BADGES[currentPlanSlug] || PLAN_BADGES.challenger;
  const PlanIcon = planBadge.icon;

  const studentsUsage = limits?.max_students 
    ? Math.round((limits.current_students / limits.max_students) * 100) 
    : 0;

  const includedSchools = currentPlan?.included_schools || 1;
  const additionalSchools = Math.max(0, (limits?.current_schools || 1) - includedSchools);
  const addonSchoolPrice = limits?.addon_school_price_cents || 49700;
  const basePlanPrice = currentPlan?.price_cents || 0;
  const addonTotal = additionalSchools * addonSchoolPrice;
  const totalMonthly = basePlanPrice + addonTotal;

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Minha Assinatura</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie seu plano e visualize seu uso
            </p>
          </div>
        </div>

        {/* Current Plan Card */}
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Seu Plano Atual</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleManageSubscription}
                disabled={isStripeLoading}
              >
                {isStripeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                Gerenciar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Name and Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${planBadge.color} border px-3 py-1.5 text-sm font-semibold`}>
                  <PlanIcon className="h-4 w-4 mr-1.5" />
                  {limits?.plan_name || 'Challenger'}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{formatCurrency(basePlanPrice)}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>

            <Separator />

            {/* Students Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Alunos</span>
                <span className="font-medium">
                  {limits?.current_students || 0}/{limits?.max_students || 0} ({studentsUsage}%)
                </span>
              </div>
              <Progress value={studentsUsage} className="h-2" />
              {studentsUsage >= 80 && (
                <p className="text-xs text-amber-400">
                  ⚠️ Você está usando {studentsUsage}% da sua capacidade de alunos
                </p>
              )}
            </div>

            {/* Schools */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Escolas</span>
              <span className="font-medium text-sm">
                {limits?.current_schools || 1} ({includedSchools} incluída{includedSchools > 1 ? 's' : ''}{additionalSchools > 0 ? ` + ${additionalSchools} adicional` : ''})
              </span>
            </div>

            <Separator />

            {/* Cost Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                Custo Mensal
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano {limits?.plan_name || 'Challenger'}</span>
                  <span>{formatCurrency(basePlanPrice)}</span>
                </div>
                {additionalSchools > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      + {additionalSchools} Escola{additionalSchools > 1 ? 's' : ''} Adicional
                    </span>
                    <span>{formatCurrency(addonTotal)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalMonthly)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tudo que o Klase Oferece
            </CardTitle>
            <CardDescription>
              Todas as funcionalidades estão incluídas em todos os planos. A diferença é apenas a capacidade de alunos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {KLASE_FEATURES.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border/30"
                >
                  <div className="p-1.5 rounded-md bg-primary/20">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{feature.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Planos Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allPlans?.map((plan) => {
              const isCurrentPlan = plan.slug === currentPlanSlug;
              const badge = PLAN_BADGES[plan.slug] || PLAN_BADGES.challenger;
              const Icon = badge.icon;

              return (
                <Card
                  key={plan.id}
                  className={`glass border-border/50 relative ${
                    isCurrentPlan ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Check className="h-3 w-3 mr-1" />
                        Atual
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-6">
                    <div className="mx-auto mb-2">
                      <Icon className={`h-8 w-8 ${badge.color.split(' ')[1]}`} />
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{formatCurrency(plan.price_cents)}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Até <span className="font-semibold text-foreground">{plan.max_students}</span> alunos
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {plan.included_schools} escola{plan.included_schools > 1 ? 's' : ''} incluída{plan.included_schools > 1 ? 's' : ''}
                    </p>
                    {!isCurrentPlan && plan.max_students > (limits?.max_students || 0) && (
                      <Button 
                        className="w-full gap-2 mt-4"
                        onClick={() => handleUpgrade(plan.slug)}
                        disabled={isStripeLoading}
                      >
                        {isStripeLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        Assinar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Add School */}
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/50 border border-border/30">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Adicionar Escola</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione uma unidade (filial) ao seu painel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-primary">
                +{formatCurrency(addonSchoolPrice)}/mês
              </span>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleAddSchool}
                disabled={isStripeLoading}
              >
                {isStripeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
