import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlatformAnnouncementModal } from '@/components/platform/PlatformAnnouncementModal';

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

export default function PlatformAnnouncements() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['platform-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
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

  // Summary stats
  const totalAnnouncements = announcements.length;
  const totalRecipients = Object.values(announcementStats).reduce((acc, s) => acc + (s?.total || 0), 0);
  const totalRead = Object.values(announcementStats).reduce((acc, s) => acc + (s?.read || 0), 0);

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

      {/* Announcements Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Histórico de Anúncios</CardTitle>
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
                ) : announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum anúncio enviado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  announcements.map((announcement) => {
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
                                      {role}
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
                                    {role}
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
