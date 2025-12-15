import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useClasses } from '@/hooks/useClasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Download, Filter, X, MapPin, Users, UserPlus, Loader2, Copy, Edit, Archive } from 'lucide-react';
import { EventDetailsDialog } from '@/components/secretaria/EventDetailsDialog';
import { Post } from '@/types/post';
import { format, isPast, isFuture, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { useEventMetrics } from '@/hooks/useEventMetrics';
import { useDebounce } from '@/hooks/useDebounce';
import { SmartPostFilters } from '@/utils/post-filters';

// Função helper para calcular participantes
const calculateCurrentParticipants = (
  event: Post,
  metrics: { confirmationsCount: number; invitationsCount: number } | undefined
): number => {
  if (!metrics) return 0;
  if (event.eventCapacityType === 'GLOBAL') {
    return metrics.confirmationsCount + metrics.invitationsCount;
  }
  return metrics.invitationsCount; // PER_STUDENT só conta convites
};

export default function EventosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'future' | 'today' | 'past'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [allowInvitationsFilter, setAllowInvitationsFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedEvent, setSelectedEvent] = useState<Post | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const { posts, isLoading } = usePosts({ type: 'EVENTO' });
  const { classes } = useClasses();
  
  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    if (!posts) return [];
    
    let finalResults = posts.filter((event) => {
      // Busca por título
      if (debouncedSearchTerm && !event.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro de status
      if (statusFilter !== 'all' && event.eventStartAt) {
        const eventDate = parseISO(event.eventStartAt);
        if (statusFilter === 'future' && !isFuture(eventDate)) return false;
        if (statusFilter === 'today' && !isToday(eventDate)) return false;
        if (statusFilter === 'past' && !isPast(eventDate)) return false;
      }
      
      // Filtro de turma
      if (classFilter !== 'all') {
        if (!event.classIds || !event.classIds.includes(classFilter)) {
          return false;
        }
      }
      
      // Filtro de convites
      if (allowInvitationsFilter !== 'all') {
        const allows = allowInvitationsFilter === 'yes';
        if (event.allowInvitations !== allows) return false;
      }
      
      return true;
    });

    // Usar filtro inteligente quando statusFilter é 'all'
    if (statusFilter === 'all') {
      finalResults = SmartPostFilters.filterRelevantPosts(finalResults);
    }

    return finalResults;
  }, [posts, debouncedSearchTerm, statusFilter, classFilter, allowInvitationsFilter]);
  
  // Métricas gerais
  const metrics = useMemo(() => {
    if (!posts) return { total: 0, future: 0, today: 0, past: 0 };
    
    const publishedEvents = posts.filter(p => p.status === 'PUBLISHED');
    
    return {
      total: publishedEvents.length,
      future: publishedEvents.filter(p => p.eventStartAt && isFuture(parseISO(p.eventStartAt))).length,
      today: publishedEvents.filter(p => p.eventStartAt && isToday(parseISO(p.eventStartAt))).length,
      past: publishedEvents.filter(p => p.eventStartAt && isPast(parseISO(p.eventStartAt))).length,
    };
  }, [posts]);
  
  const activeFiltersCount = [
    searchTerm,
    statusFilter !== 'all',
    classFilter !== 'all',
    allowInvitationsFilter !== 'all',
  ].filter(Boolean).length;
  
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setClassFilter('all');
    setAllowInvitationsFilter('all');
  };
  
  const copyEventLink = (eventId: string) => {
    const link = `${window.location.origin}/aluno/feed?postId=${eventId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link do evento foi copiado para a área de transferência.',
    });
  };
  
  const editEvent = (eventId: string) => {
    navigate(`/secretaria/feed?edit=${eventId}`);
  };
  
  const exportAllEvents = () => {
    const csvData = filteredEvents.map((event) => {
      const eventDate = event.eventStartAt ? parseISO(event.eventStartAt) : null;
      const status = eventDate ? (isPast(eventDate) ? 'Realizado' : isFuture(eventDate) ? 'Futuro' : 'Hoje') : 'N/A';
      
      return {
        'Título': event.title,
        'Data/Hora': eventDate ? format(eventDate, 'dd/MM/yyyy HH:mm') : 'N/A',
        'Local': event.eventLocation || 'N/A',
        'Turmas': event.classIds?.length ? event.classIds.join(', ') : 'Global',
        'Status': status,
        'Permite Convites': event.allowInvitations ? 'Sim' : 'Não',
        'Autor': event.authorName,
      };
    });
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `eventos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'CSV exportado com sucesso!',
      description: `${filteredEvents.length} eventos exportados.`,
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="glass-card neon-glow p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              Gestão de Eventos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie eventos, confirmações e convites de amigos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportAllEvents}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => navigate('/secretaria/feed')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Evento
            </Button>
          </div>
        </div>
        
        {/* Métricas Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total de Eventos</p>
              <p className="text-3xl font-bold gradient-text">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Futuros</p>
              <p className="text-3xl font-bold text-green-400">{metrics.future}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Hoje</p>
              <p className="text-3xl font-bold text-blue-400">{metrics.today}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Passados</p>
              <p className="text-3xl font-bold text-gray-400">{metrics.past}</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Filtros Avançados */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status do Evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="future">Futuros</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="past">Passados</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {classes?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={allowInvitationsFilter} onValueChange={(value: any) => setAllowInvitationsFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Permite Convites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Sim</SelectItem>
                <SelectItem value="no">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de Eventos */}
      {filteredEvents.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {activeFiltersCount > 0 
                ? 'Tente ajustar os filtros ou limpar para ver mais eventos.'
                : 'Comece criando seu primeiro evento!'}
            </p>
            <Button onClick={() => navigate('/secretaria/feed')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              onViewDetails={() => setSelectedEvent(event)}
              onCopyLink={() => copyEventLink(event.id)}
              onEdit={() => editEvent(event.id)}
            />
          ))}
        </div>
      )}
      
      {/* Modal de Detalhes */}
      <EventDetailsDialog 
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </div>
  );
}

interface EventCardProps {
  event: Post;
  onViewDetails: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
}

function EventCard({ event, onViewDetails, onCopyLink, onEdit }: EventCardProps) {
  const eventDate = event.eventStartAt ? parseISO(event.eventStartAt) : null;
  const { data: metrics } = useEventMetrics(event.id);
  const currentParticipants = calculateCurrentParticipants(event, metrics);
  
  const getStatusBadge = () => {
    if (!eventDate) return { label: 'Sem data', variant: 'secondary' as const };
    
    if (isPast(eventDate)) {
      return { label: 'Realizado', variant: 'secondary' as const };
    }
    
    if (isToday(eventDate)) {
      return { label: 'Hoje', variant: 'default' as const };
    }
    
    return { label: 'Futuro', variant: 'outline' as const };
  };
  
  const statusBadge = getStatusBadge();
  
  return (
    <Card className="glass-card hover:neon-glow transition-all cursor-pointer group" onClick={onViewDetails}>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {event.allowInvitations && (
            <Badge variant="outline" className="gap-1">
              <UserPlus className="h-3 w-3" />
              Convites
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
        {event.body && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{event.body}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {eventDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(eventDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        )}
        
        {event.eventLocation && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="line-clamp-1">{event.eventLocation}</span>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm pt-2 border-t">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-green-400" />
            <span>{metrics?.confirmationsCount || 0} confirmações</span>
          </div>
          <div className="flex items-center gap-1">
            <UserPlus className="h-4 w-4 text-purple-400" />
            <span>{metrics?.invitationsCount || 0} convites</span>
          </div>
        </div>

        {event.eventCapacityEnabled && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {event.eventCapacityType === 'GLOBAL' && (
              <>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
                  <Users className="h-3 w-3" />
                  {currentParticipants}/{event.eventMaxParticipants}
                </Badge>
                {currentParticipants >= (event.eventMaxParticipants || 0) && (
                  <Badge variant="destructive" className="bg-red-500/20 text-red-400">Lotado</Badge>
                )}
              </>
            )}
            {event.eventCapacityType === 'PER_STUDENT' && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1">
                <UserPlus className="h-3 w-3" />
                Máx. {event.eventMaxGuestsPerStudent} por aluno
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            Ver Detalhes
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink();
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
