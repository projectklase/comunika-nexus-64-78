import { useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter,
  Users,
  GraduationCap,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function getStatusBadge(subscription: any, isActive: boolean) {
  if (!isActive) {
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Inativa</Badge>;
  }
  
  if (!subscription) {
    return <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500"><AlertTriangle className="w-3 h-3" /> Sem Assinatura</Badge>;
  }

  if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) {
    return <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-500"><Clock className="w-3 h-3" /> Trial</Badge>;
  }

  if (subscription.status === 'active') {
    return <Badge variant="default" className="gap-1 bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3" /> Ativa</Badge>;
  }

  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {subscription.status}</Badge>;
}

export default function PlatformSchools() {
  const { schoolsOverview, loadingSchoolsOverview, refetchSchoolsOverview } = useSuperAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSchools = schoolsOverview?.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase()) ||
                         school.slug.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && school.is_active && school.subscription?.status === 'active';
    if (statusFilter === 'trial') return matchesSearch && school.subscription?.trial_ends_at;
    if (statusFilter === 'inactive') return matchesSearch && !school.is_active;
    if (statusFilter === 'no_subscription') return matchesSearch && !school.subscription;
    
    return matchesSearch;
  }) || [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Escolas
          </h1>
          <p className="text-muted-foreground mt-1">
            {schoolsOverview?.length || 0} escolas cadastradas na plataforma
          </p>
        </div>
        <Button onClick={() => refetchSchoolsOverview()} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
                <SelectItem value="no_subscription">Sem Assinatura</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schools List */}
      <div className="space-y-4">
        {loadingSchoolsOverview ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : filteredSchools.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma escola encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredSchools.map((school) => (
            <Card key={school.id} className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: school.primary_color ? `${school.primary_color}20` : 'hsl(var(--primary) / 0.1)' }}
                  >
                    {school.logo_url ? (
                      <img src={school.logo_url} alt={school.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6" style={{ color: school.primary_color || 'hsl(var(--primary))' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{school.name}</h3>
                      {getStatusBadge(school.subscription, school.is_active)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {school.total_users} usuários
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {school.total_students} alunos
                      </span>
                      <span>/{school.slug}</span>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="hidden md:block text-right">
                    {school.subscription ? (
                      <>
                        <p className="text-sm font-medium text-foreground">{school.subscription.plan_name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(school.subscription.price_cents)}/mês</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-muted-foreground">Criada em</p>
                    <p className="text-sm">{format(new Date(school.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
