import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Megaphone,
  Rocket,
  Gift,
  Zap,
  Bell,
  Star,
  PartyPopper,
  Sparkles,
  Heart,
  AlertTriangle,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Search,
  X,
  Calendar,
} from 'lucide-react';
import { format, differenceInDays, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlatformAnnouncementModal } from '@/components/platform/PlatformAnnouncementModal';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Megaphone,
  Rocket,
  Gift,
  Zap,
  Bell,
  Star,
  PartyPopper,
  Sparkles,
  Heart,
  AlertTriangle,
};

const ROLE_LABELS: Record<string, string> = {
  aluno: 'Alunos',
  professor: 'Professores',
  secretaria: 'Secretárias',
  administrador: 'Admins',
};

interface Announcement {
  id: string;
  title: string;
  message: string;
  icon_name: string;
  theme_color: string;
  target_schools: string[];
  target_roles: string[];
  created_at: string;
  is_active: boolean;
}

interface AnnouncementStats {
  total: number;
  read: number;
  unread: number;
}

type StatusFilter = 'all' | 'active' | 'archived';
type DateFilter = 'all' | 'today' | '7days' | '30days';

export default function PlatformAnnouncements() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['platform-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Normalize nullable arrays to empty arrays
      return (data || []).map(a => ({
        ...a,
        target_schools: a.target_schools || [],
        target_roles: a.target_roles || [],
      })) as Announcement[];
    },
  });

  // Fetch stats for each announcement
  const { data: announcementStats = {} } = useQuery({
    queryKey: ['announcement-stats', announcements.map(a => a.id)],
    queryFn: async () => {
      const stats: Record<string, AnnouncementStats> = {};
      for (const announcement of announcements) {
        const { data } = await supabase.rpc('get_announcement_stats', {
          p_announcement_id: announcement.id,
        });
        if (data && typeof data === 'object') {
          stats[announcement.id] = data as unknown as AnnouncementStats;
        }
      }
      return stats;
    },
    enabled: announcements.length > 0,
  });

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(query) && 
            !a.message.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !a.is_active) return false;
        if (statusFilter === 'archived' && a.is_active) return false;
      }
      
      // Date filter
      if (dateFilter !== 'all') {
        const date = new Date(a.created_at);
        const now = new Date();
        if (dateFilter === 'today' && !isToday(date)) return false;
        if (dateFilter === '7days' && differenceInDays(now, date) > 7) return false;
        if (dateFilter === '30days' && differenceInDays(now, date) > 30) return false;
      }
      
      // Role filter
      if (roleFilters.length > 0) {
        if (a.target_roles.length === 0) return true; // "Todos" matches any filter
        if (!a.target_roles.some(r => roleFilters.includes(r))) return false;
      }
      
      return true;
    });
  }, [announcements, searchQuery, statusFilter, dateFilter, roleFilters]);

  // Summary stats
  const totalAnnouncements = announcements.length;
  const totalRecipients = Object.values(announcementStats).reduce((acc, s) => acc + (s?.total || 0), 0);
  const totalRead = Object.values(announcementStats).reduce((acc, s) => acc + (s?.read || 0), 0);

  // Active filter chips
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || roleFilters.length > 0;

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setRoleFilters([]);
  };

  const toggleRoleFilter = (role: string) => {
    setRoleFilters(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Anúncios da Plataforma</h1>
          <p className="text-muted-foreground">Envie comunicados para escolas e usuários</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Anúncio
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Anúncios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{totalAnnouncements}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Destinatários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalRecipients.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Leitura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">
                {totalRecipients > 0 ? Math.round((totalRead / totalRecipients) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apple-Style Filter Section */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          {/* Search + Date Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar anúncios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/30 border-0">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Segmented Control + Role Chips Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Segmented Control - Status */}
            <div className="inline-flex p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'Ativos' },
                { value: 'archived', label: 'Arquivados' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    statusFilter === value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Role Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Roles:</span>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => toggleRoleFilter(value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                    roleFilters.includes(value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
              <span className="text-xs text-muted-foreground">Filtros ativos:</span>
              
              {searchQuery && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-destructive ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs">
                  {statusFilter === 'active' ? 'Ativos' : 'Arquivados'}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-destructive ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {dateFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs">
                  {dateFilter === 'today' ? 'Hoje' : dateFilter === '7days' ? '7 dias' : '30 dias'}
                  <button onClick={() => setDateFilter('all')} className="hover:text-destructive ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {roleFilters.map(role => (
                <Badge key={role} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs">
                  {ROLE_LABELS[role]}
                  <button onClick={() => toggleRoleFilter(role)} className="hover:text-destructive ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                Limpar todos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Anúncios</CardTitle>
            <Badge variant="outline" className="font-normal">
              {filteredAnnouncements.length} de {announcements.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anúncio</TableHead>
                  <TableHead className="hidden md:table-cell">Destinatários</TableHead>
                  <TableHead className="hidden sm:table-cell">Engajamento</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Clock className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredAnnouncements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters 
                        ? 'Nenhum anúncio corresponde aos filtros'
                        : 'Nenhum anúncio enviado ainda'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnnouncements.map((announcement) => {
                    const IconComponent = ICON_MAP[announcement.icon_name] || Megaphone;
                    const stats = announcementStats[announcement.id];
                    const readRate = stats?.total ? Math.round((stats.read / stats.total) * 100) : 0;

                    return (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: announcement.theme_color }}
                            >
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{announcement.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {announcement.message}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                                {announcement.target_roles.length === 0 ? (
                                  <Badge variant="secondary" className="text-xs">Todos</Badge>
                                ) : (
                                  announcement.target_roles.slice(0, 2).map(role => (
                                    <Badge key={role} variant="outline" className="text-xs capitalize">
                                      {ROLE_LABELS[role] || role}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {announcement.target_schools.length === 0 ? (
                                <Badge variant="secondary" className="text-xs">Todas escolas</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {announcement.target_schools.length} escolas
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {announcement.target_roles.length === 0 ? (
                                <Badge variant="secondary" className="text-xs">Todos roles</Badge>
                              ) : (
                                announcement.target_roles.map(role => (
                                  <Badge key={role} variant="outline" className="text-xs capitalize">
                                    {ROLE_LABELS[role] || role}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {stats ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{stats.total}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-20">
                                  <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${readRate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{readRate}%</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(announcement.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <PlatformAnnouncementModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
