import { useState } from 'react';
import { 
  Building2, Search, Filter, Users, GraduationCap,
  CheckCircle, XCircle, Clock, AlertTriangle,
  Edit, ToggleLeft, ToggleRight, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

export default function PlatformSchools() {
  const { schoolsOverview, loadingSchoolsOverview, refetchSchoolsOverview, updateSchool } = useSuperAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const filteredSchools = schoolsOverview?.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase()) || school.slug.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && school.is_active && school.subscription?.status === 'active';
    if (statusFilter === 'trial') return matchesSearch && school.subscription?.trial_ends_at;
    if (statusFilter === 'inactive') return matchesSearch && !school.is_active;
    if (statusFilter === 'no_subscription') return matchesSearch && !school.subscription;
    return matchesSearch;
  }) || [];

  const handleToggleActive = async (school: any) => {
    try {
      await updateSchool.mutateAsync({ schoolId: school.id, is_active: !school.is_active });
      toast.success(school.is_active ? 'Escola desativada' : 'Escola ativada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />Escolas
          </h1>
          <p className="text-muted-foreground mt-1">{schoolsOverview?.length || 0} escolas cadastradas</p>
        </div>
        <Button onClick={() => refetchSchoolsOverview()} variant="outline" size="sm">Atualizar</Button>
      </div>

      <Card className="glass-card border-white/10">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
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

      <div className="space-y-4">
        {loadingSchoolsOverview ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />) : filteredSchools.length === 0 ? (
          <Card className="glass-card border-white/10"><CardContent className="p-8 text-center"><Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">Nenhuma escola encontrada</p></CardContent></Card>
        ) : filteredSchools.map((school) => (
          <Card key={school.id} className="glass-card border-white/10 hover:border-white/20 transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: school.primary_color ? `${school.primary_color}20` : 'hsl(var(--primary) / 0.1)' }}>
                {school.logo_url ? <img src={school.logo_url} alt={school.name} className="w-8 h-8 object-contain" /> : <Building2 className="w-6 h-6" style={{ color: school.primary_color || 'hsl(var(--primary))' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-foreground truncate">{school.name}</h3>{getStatusBadge(school.subscription, school.is_active)}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{school.total_users} usuários</span>
                  <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{school.total_students} alunos</span>
                  <span>/{school.slug}</span>
                </div>
              </div>
              <div className="hidden md:block text-right">{school.subscription ? <><p className="text-sm font-medium">{school.subscription.plan_name}</p><p className="text-xs text-muted-foreground">{formatCurrency(school.subscription.price_cents)}/mês</p></> : <p className="text-sm text-muted-foreground">—</p>}</div>
              <div className="hidden lg:block text-right"><p className="text-xs text-muted-foreground">Criada em</p><p className="text-sm">{format(new Date(school.created_at), "dd/MM/yyyy", { locale: ptBR })}</p></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSelectedSchool(school); setEditModalOpen(true); }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleToggleActive(school)}>{school.is_active ? <><ToggleLeft className="w-4 h-4 mr-2" />Desativar</> : <><ToggleRight className="w-4 h-4 mr-2" />Ativar</>}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      <SchoolEditModal open={editModalOpen} onOpenChange={setEditModalOpen} school={selectedSchool} onSuccess={() => { refetchSchoolsOverview(); setEditModalOpen(false); }} />
    </div>
  );
}