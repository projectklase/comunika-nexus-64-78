import { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter,
  Building2,
  GraduationCap,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  CreditCard
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { SubscriptionManagementModal } from '@/components/platform/SubscriptionManagementModal';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function getSubscriptionBadge(subscription: any) {
  if (!subscription) {
    return <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500"><AlertTriangle className="w-3 h-3" /> Sem Plano</Badge>;
  }

  if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) {
    return <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-500"><Clock className="w-3 h-3" /> Trial</Badge>;
  }

  if (subscription.status === 'active') {
    return <Badge variant="default" className="gap-1 bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3" /> {subscription.plan_name}</Badge>;
  }

  if (subscription.status === 'canceled') {
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Cancelado</Badge>;
  }

  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {subscription.status}</Badge>;
}

export default function PlatformAdmins() {
  const { adminsOverview, loadingAdminsOverview, refetchAdminsOverview } = useSuperAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  const filteredAdmins = adminsOverview?.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(search.toLowerCase()) ||
                         admin.email.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && admin.subscription?.status === 'active';
    if (statusFilter === 'trial') return matchesSearch && admin.subscription?.trial_ends_at;
    if (statusFilter === 'no_subscription') return matchesSearch && !admin.subscription;
    if (statusFilter === 'canceled') return matchesSearch && admin.subscription?.status === 'canceled';
    
    return matchesSearch;
  }) || [];

  const handleManageSubscription = (admin: any) => {
    setSelectedAdmin(admin);
    setSubscriptionModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Administradores
          </h1>
          <p className="text-muted-foreground mt-1">
            {adminsOverview?.length || 0} administradores na plataforma
          </p>
        </div>
        <Button onClick={() => refetchAdminsOverview()} variant="outline" size="sm">
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
                placeholder="Buscar por nome ou email..."
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
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
                <SelectItem value="no_subscription">Sem Plano</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admins List */}
      <div className="space-y-4">
        {loadingAdminsOverview ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        ) : filteredAdmins.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum administrador encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredAdmins.map((admin) => (
            <Card key={admin.id} className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={admin.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {admin.name?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{admin.name}</h3>
                      {getSubscriptionBadge(admin.subscription)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {admin.email}
                      </span>
                      {admin.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {admin.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {admin.schools_count} {admin.schools_count === 1 ? 'escola' : 'escolas'}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {admin.total_students} alunos
                      </span>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="hidden md:block text-right">
                    {admin.subscription ? (
                      <>
                        <p className="text-sm font-medium text-foreground">{formatCurrency(admin.subscription.price_cents)}/mês</p>
                        <p className="text-xs text-muted-foreground">
                          {admin.subscription.addon_schools > 0 && `+${admin.subscription.addon_schools} escolas`}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-muted-foreground">Desde</p>
                    <p className="text-sm">{format(new Date(admin.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>

                  {/* Actions */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="shrink-0 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={() => handleManageSubscription(admin)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Assinatura
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        open={subscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
        admin={selectedAdmin}
        onSuccess={() => {
          refetchAdminsOverview();
          setSubscriptionModalOpen(false);
        }}
      />
    </div>
  );
}