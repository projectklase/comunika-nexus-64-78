import { useState, useMemo } from 'react';
import { 
  Building2, Search, Filter, Users, GraduationCap,
  CheckCircle, XCircle, Clock, AlertTriangle,
  Edit, ToggleLeft, ToggleRight, MoreHorizontal,
  User, Crown, Plus, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SchoolEditModal } from '@/components/platform/SchoolEditModal';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function getStatusBadge(subscription: any, isActive: boolean) {
  if (!isActive) return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Inativa</Badge>;
  if (!subscription) return <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500"><AlertTriangle className="w-3 h-3" /> Sem Assinatura</Badge>;
  if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) return <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-500"><Clock className="w-3 h-3" /> Trial</Badge>;
  if (subscription.status === 'active') return <Badge variant="default" className="gap-1 bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3" /> Ativa</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {subscription.status}</Badge>;
}

function getSchoolTypeBadge(isAddon: boolean) {
  if (isAddon) {
    return (
      <Badge variant="outline" className="gap-1 border-purple-500/50 text-purple-400 bg-purple-500/10">
        <Plus className="w-3 h-3" /> Adicional
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
      <Crown className="w-3 h-3" /> Principal
    </Badge>
  );
}

interface AdminGroup {
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  subscription: any;
  schools: any[];
  totalMonthlyCost: number;
  hasInconsistency: boolean;
}

export default function PlatformSchools() {
  const { schoolsOverview, loadingSchoolsOverview, refetchSchoolsOverview, updateSchool } = useSuperAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Group schools by admin
  const adminGroups = useMemo(() => {
    if (!schoolsOverview) return [];

    const groups: Record<string, AdminGroup> = {};
    
    schoolsOverview.forEach(school => {
      const key = school.admin_id || 'sem_admin';
      
      if (!groups[key]) {
        groups[key] = {
          admin_id: school.admin_id,
          admin_name: school.admin_name,
          admin_email: school.admin_email,
          subscription: school.subscription,
          schools: [],
          totalMonthlyCost: 0,
          hasInconsistency: false,
        };
      }
      
      groups[key].schools.push(school);
    });

    // Calculate costs and check for inconsistencies
    Object.values(groups).forEach(group => {
      if (group.subscription) {
        const baseCost = group.subscription.price_cents;
        const addonSchoolsCount = group.subscription.addon_schools || 0;
        const addonCost = addonSchoolsCount * (group.subscription.addon_school_price_cents || 49700);
        group.totalMonthlyCost = baseCost + addonCost;
        
        // Check inconsistency: more schools than included + addon
        const totalAllowed = (group.subscription.included_schools || 1) + addonSchoolsCount;
        const activeSchools = group.schools.filter(s => s.is_active).length;
        group.hasInconsistency = activeSchools > totalAllowed;
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (!a.admin_name) return 1;
      if (!b.admin_name) return -1;
      return a.admin_name.localeCompare(b.admin_name);
    });
  }, [schoolsOverview]);

  // Get unique admins for filter dropdown
  const uniqueAdmins = useMemo(() => {
    return adminGroups.filter(g => g.admin_id).map(g => ({
      id: g.admin_id!,
      name: g.admin_name!,
    }));
  }, [adminGroups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return adminGroups.map(group => {
      const filteredSchools = group.schools.filter(school => {
        const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase()) || 
                              school.slug.toLowerCase().includes(search.toLowerCase()) ||
                              (group.admin_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
        
        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = school.is_active && school.subscription?.status === 'active';
        else if (statusFilter === 'trial') matchesStatus = !!school.subscription?.trial_ends_at;
        else if (statusFilter === 'inactive') matchesStatus = !school.is_active;
        else if (statusFilter === 'no_subscription') matchesStatus = !school.subscription;
        
        const matchesAdmin = adminFilter === 'all' || group.admin_id === adminFilter;
        
        return matchesSearch && matchesStatus && matchesAdmin;
      });
      
      return { ...group, schools: filteredSchools };
    }).filter(group => group.schools.length > 0);
  }, [adminGroups, search, statusFilter, adminFilter]);

  const handleToggleActive = async (school: any) => {
    try {
      await updateSchool.mutateAsync({ schoolId: school.id, is_active: !school.is_active });
      toast.success(school.is_active ? 'Escola desativada' : 'Escola ativada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status');
    }
  };

  const totalSchools = schoolsOverview?.length || 0;
  const totalAdmins = adminGroups.filter(g => g.admin_id).length;

  return (
    <TooltipProvider>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />Escolas
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalSchools} escolas • {totalAdmins} administradores
            </p>
          </div>
          <Button onClick={() => refetchSchoolsOverview()} variant="outline" size="sm">Atualizar</Button>
        </div>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar escola ou admin..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
            </div>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="w-full md:w-56 bg-white/5 border-white/10">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Administrador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Admins</SelectItem>
                {uniqueAdmins.map(admin => (
                  <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loadingSchoolsOverview ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
          ) : filteredGroups.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma escola encontrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredGroups.map((group) => (
              <Card key={group.admin_id || 'no-admin'} className="glass-card border-white/10 overflow-hidden">
                {/* Admin Header */}
                <CardHeader className="border-b border-white/10 bg-white/5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {group.admin_name || 'Sem Administrador'}
                          {group.hasInconsistency && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-red-400 font-medium">Inconsistência de cobrança!</p>
                                <p className="text-xs">Mais escolas ativas do que o contratado. Verificar add-ons.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{group.admin_email || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-right">
                      {group.subscription ? (
                        <>
                          <div>
                            <p className="text-sm font-medium text-primary">{group.subscription.plan_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.schools.length} {group.schools.length === 1 ? 'escola' : 'escolas'}
                              {group.subscription.addon_schools > 0 && (
                                <span className="text-purple-400"> (+{group.subscription.addon_schools} add-on)</span>
                              )}
                            </p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                                <p className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {formatCurrency(group.totalMonthlyCost)}
                                </p>
                                <p className="text-xs text-emerald-400/70">/mês</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">Detalhamento:</p>
                                <p className="text-xs">Plano base: {formatCurrency(group.subscription.price_cents)}</p>
                                {group.subscription.addon_schools > 0 && (
                                  <p className="text-xs">
                                    Add-ons ({group.subscription.addon_schools}x): {formatCurrency(group.subscription.addon_schools * (group.subscription.addon_school_price_cents || 49700))}
                                  </p>
                                )}
                                <p className="text-xs font-medium border-t border-white/10 pt-1">
                                  Total: {formatCurrency(group.totalMonthlyCost)}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Sem Assinatura
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Schools List */}
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {group.schools.map((school) => (
                      <div key={school.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" 
                          style={{ backgroundColor: school.primary_color ? `${school.primary_color}20` : 'hsl(var(--primary) / 0.1)' }}
                        >
                          {school.logo_url ? (
                            <img src={school.logo_url} alt={school.name} className="w-6 h-6 object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5" style={{ color: school.primary_color || 'hsl(var(--primary))' }} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-foreground">{school.name}</h3>
                            {getSchoolTypeBadge(school.is_addon_school)}
                            {getStatusBadge(school.subscription, school.is_active)}
                            {school.is_addon_school && group.subscription && (
                              <span className="text-xs text-purple-400">
                                +{formatCurrency(group.subscription.addon_school_price_cents || 49700)}/mês
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{school.total_users} usuários
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />{school.total_students} alunos
                            </span>
                            <span className="text-xs">/{school.slug}</span>
                          </div>
                        </div>
                        
                        <div className="hidden lg:block text-right text-sm text-muted-foreground">
                          <p className="text-xs">Criada em</p>
                          <p>{format(new Date(school.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedSchool(school); setEditModalOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(school)}>
                              {school.is_active ? (
                                <><ToggleLeft className="w-4 h-4 mr-2" />Desativar</>
                              ) : (
                                <><ToggleRight className="w-4 h-4 mr-2" />Ativar</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <SchoolEditModal 
          open={editModalOpen} 
          onOpenChange={setEditModalOpen} 
          school={selectedSchool} 
          onSuccess={() => { refetchSchoolsOverview(); setEditModalOpen(false); }} 
        />
      </div>
    </TooltipProvider>
  );
}
