import { useState, useEffect, useMemo } from 'react';
import { useAuditStore } from '@/stores/audit-store';
import { usePeopleStore } from '@/stores/people-store';
import { useClassStore } from '@/stores/class-store';
import { AuditFilters, AuditEvent } from '@/types/audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  Search, 
  Calendar,
  User,
  FileText,
  Users,
  BookOpen,
  Clock,
  Eye,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { 
  getActionLabel, 
  getEntityLabel, 
  getActionChipClass, 
  getEntityChipClass,
  formatRelativeTime,
  formatDisplayValue,
  getFieldLabel
} from '@/utils/audit-helpers';

export default function HistoricoPage() {
  const { events, loading, loadEvents, getFilteredEvents, exportEvents } = useAuditStore();
  const { getTeachers, getStudents } = usePeopleStore();
  const { getActiveClasses } = useClassStore();
  
  const [filters, setFilters] = useState<AuditFilters>({
    period: '30d',
    entity: 'ALL_ENTITIES',
    action: 'ALL_ACTIONS',
    actor_id: 'ALL_USERS',
    class_id: 'ALL_CLASSES',
    post_type: 'ALL_POST_TYPES',
    search: ''
  });
  
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  
  // Add some mock events for testing if none exist
  useEffect(() => {
    if (events.length === 0) {
      // This is just for testing - in real usage, events will come from actual actions
      console.log('No audit events found. Events will appear when you create/edit posts, classes, etc.');
    }
  }, [events]);
  
  // Memoizar dados filtrados
  const filteredEvents = useMemo(() => {
    return getFilteredEvents(filters);
  }, [filters, events, getFilteredEvents]);
  
  // Dados para selects
  const teachers = getTeachers();
  const students = getStudents();
  const classes = getActiveClasses();
  const allUsers = [...teachers, ...students];
  
  const handleExport = () => {
    exportEvents(filteredEvents);
  };
  
  const updateFilter = (key: keyof AuditFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Histórico</h1>
          <p className="text-muted-foreground">
            Registro completo de todas as alterações no workspace
          </p>
        </div>
        
        <Button onClick={handleExport} disabled={filteredEvents.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>
      
      {/* Filtros */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Período */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select 
                value={filters.period || 'ALL_PERIODS'} 
                onValueChange={(value) => updateFilter('period', value === 'ALL_PERIODS' ? undefined : value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="ALL_PERIODS">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Usuário */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuário</label>
              <Select 
                value={filters.actor_id || 'ALL_USERS'} 
                onValueChange={(value) => updateFilter('actor_id', value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="ALL_USERS">Todos os usuários</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Entidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Entidade</label>
              <Select 
                value={filters.entity || 'ALL_ENTITIES'} 
                onValueChange={(value) => updateFilter('entity', value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="ALL_ENTITIES">Todas as entidades</SelectItem>
                  <SelectItem value="POST">Posts</SelectItem>
                  <SelectItem value="CLASS">Turmas</SelectItem>
                  <SelectItem value="STUDENT">Alunos</SelectItem>
                  <SelectItem value="TEACHER">Professores</SelectItem>
                  <SelectItem value="MEMBERSHIP">Vínculos</SelectItem>
                  <SelectItem value="SUBJECT">Matérias</SelectItem>
                  <SelectItem value="LEVEL">Níveis</SelectItem>
                  <SelectItem value="MODALIDADE">Modalidades</SelectItem>
                  <SelectItem value="PROGRAM">Programas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Ação */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ação</label>
              <Select 
                value={filters.action || 'ALL_ACTIONS'} 
                onValueChange={(value) => updateFilter('action', value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="ALL_ACTIONS">Todas as ações</SelectItem>
                  <SelectItem value="CREATE">Criação</SelectItem>
                  <SelectItem value="UPDATE">Edição</SelectItem>
                  <SelectItem value="DELETE">Remoção</SelectItem>
                  <SelectItem value="ARCHIVE">Arquivamento</SelectItem>
                  <SelectItem value="PUBLISH">Publicação</SelectItem>
                  <SelectItem value="SCHEDULE">Agendamento</SelectItem>
                  <SelectItem value="ASSIGN">Atribuição</SelectItem>
                  <SelectItem value="IMPORT">Importação</SelectItem>
                  <SelectItem value="EXPORT">Exportação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Turma */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <Select 
                value={filters.class_id || 'ALL_CLASSES'} 
                onValueChange={(value) => updateFilter('class_id', value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="ALL_CLASSES">Todas as turmas</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Tipo de Post */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Post</label>
              <Select 
                value={filters.post_type || 'ALL_POST_TYPES'} 
                onValueChange={(value) => updateFilter('post_type', value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="ALL_POST_TYPES">Todos os tipos</SelectItem>
                  <SelectItem value="AVISO">Aviso</SelectItem>
                  <SelectItem value="COMUNICADO">Comunicado</SelectItem>
                  <SelectItem value="EVENTO">Evento</SelectItem>
                  <SelectItem value="ATIVIDADE">Atividade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Busca */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, nome, email ou ID..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10 glass-input"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredEvents.length} evento(s) encontrado(s)
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="glass-card">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="table">Tabela</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Content */}
      {filteredEvents.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Não há eventos registrados para os filtros selecionados.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilters({
                period: '30d',
                entity: 'ALL_ENTITIES',
                action: 'ALL_ACTIONS',
                actor_id: 'ALL_USERS',
                class_id: 'ALL_CLASSES',
                post_type: 'ALL_POST_TYPES',
                search: ''
              })}
              className="glass-button"
            >
              Ver todos os eventos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="timeline" className="space-y-4">
            <TimelineView events={filteredEvents} />
          </TabsContent>
          
          <TabsContent value="table" className="space-y-4">
            <TableView events={filteredEvents} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Timeline View Component
function TimelineView({ events }: { events: AuditEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className="glass-card hover:glass-hover transition-all">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt={event.actor_name || 'Usuário'} />
                <AvatarFallback className="glass">
                  {event.actor_name ? event.actor_name.split(' ').map(n => n[0]).join('') : '?'}
                </AvatarFallback>
              </Avatar>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{event.actor_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.actor_role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(event.at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={getActionChipClass(event.action)}>
                    {getActionLabel(event.action)}
                  </Badge>
                  <Badge className={getEntityChipClass(event.entity)}>
                    {getEntityLabel(event.entity)}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium">{event.entity_label}</span>
                  {event.scope !== 'GLOBAL' && event.class_name && (
                    <span> • Turma: {event.class_name}</span>
                  )}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {event.meta.fields && event.meta.fields.length > 0 && (
                      <span>Campos alterados: {event.meta.fields.join(', ')}</span>
                    )}
                  </div>
                  
                  <EventDetailsDrawer event={event} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Table View Component  
function TableView({ events }: { events: AuditEvent[] }) {
  return (
    <Card className="glass-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-4 font-medium">Data/Hora</th>
              <th className="text-left p-4 font-medium">Usuário</th>
              <th className="text-left p-4 font-medium">Ação</th>
              <th className="text-left p-4 font-medium">Entidade</th>
              <th className="text-left p-4 font-medium">Alvo</th>
              <th className="text-left p-4 font-medium">Escopo</th>
              <th className="text-left p-4 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border/30 hover:bg-accent/20">
                <td className="p-4 text-sm">
                  <div>{formatRelativeTime(event.at)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.at).toLocaleString('pt-BR')}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {event.actor_name ? event.actor_name.split(' ').map(n => n[0]).join('') : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{event.actor_name || 'Usuário desconhecido'}</div>
                      <div className="text-xs text-muted-foreground">{event.actor_role || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={getActionChipClass(event.action)}>
                    {getActionLabel(event.action)}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge className={getEntityChipClass(event.entity)}>
                    {getEntityLabel(event.entity)}
                  </Badge>
                </td>
                <td className="p-4 text-sm max-w-48 truncate">
                  {event.entity_label}
                </td>
                <td className="p-4 text-sm">
                  {event.scope === 'GLOBAL' ? 'Global' : event.class_name || 'Turma'}
                </td>
                <td className="p-4">
                  <EventDetailsDrawer event={event} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Event Details Drawer
function EventDetailsDrawer({ event }: { event: AuditEvent }) {
  const diffEntries = event.diff_json && typeof event.diff_json === 'object' 
    ? Object.entries(event.diff_json) 
    : [];
  
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="glass-button">
          <Eye className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="glass-card max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center space-x-2">
            <Badge className={getActionChipClass(event.action)}>
              {getActionLabel(event.action)}
            </Badge>
            <Badge className={getEntityChipClass(event.entity)}>
              {getEntityLabel(event.entity)}
            </Badge>
            <span>{event.entity_label}</span>
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Informações gerais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
              <p>{new Date(event.at).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Usuário</label>
              <p>{event.actor_name || 'Usuário desconhecido'} ({event.actor_email || 'Email não disponível'})</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p>{event.actor_role || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Escopo</label>
              <p>{event.scope === 'GLOBAL' ? 'Global' : event.class_name || 'Turma'}</p>
            </div>
          </div>
          
          {/* Diferenças */}
          {diffEntries.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Alterações</h3>
              <div className="space-y-4">
                {diffEntries.map(([field, diff]) => (
                  <div key={field} className="glass-card p-4">
                     <h4 className="font-medium mb-2 flex items-center">
                       {getFieldLabel(field)}
                       <Badge variant="outline" className="ml-2 text-xs">
                         Alterado
                       </Badge>
                     </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Antes</label>
                        <p className="text-sm bg-red-500/10 border border-red-500/20 rounded p-2 mt-1">
                          {formatDisplayValue(diff.before)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Depois</label>
                        <p className="text-sm bg-green-500/10 border border-green-500/20 rounded p-2 mt-1">
                          {formatDisplayValue(diff.after)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Metadata */}
          {Object.keys(event.meta).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Metadados</h3>
              <div className="glass-card p-4">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(event.meta, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {/* Ações futuras (placeholder) */}
          <div className="flex space-x-2 pt-4 border-t border-border/50">
            <Button variant="outline" disabled className="glass-button">
              Abrir entidade
            </Button>
            <Button variant="outline" disabled className="glass-button">
              Reverter alteração
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}