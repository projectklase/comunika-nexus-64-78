import { useState, useEffect } from 'react';
import { Bell, Search, Filter, Archive, Check, CheckCheck, Trash2, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { notificationStore, Notification, NotificationStatus, NotificationType } from '@/stores/notification-store';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { NotificationDebugger } from '@/components/notifications/NotificationDebugger';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (!user || user.role !== 'secretaria') {
      navigate('/');
      return;
    }

    const updateNotifications = () => {
      const all = notificationStore.list({
        roleTarget: 'SECRETARIA'
      });
      setNotifications(all);
    };

    updateNotifications();
    const unsubscribe = notificationStore.subscribe(updateNotifications);
    return unsubscribe;
  }, [user, navigate]);

  // Filter notifications based on tab and search
  useEffect(() => {
    let filtered = [...notifications];

    // Filter by status tab
    if (selectedTab !== 'all') {
      const statusMap: Record<string, NotificationStatus> = {
        'unread': 'UNREAD',
        'read': 'READ',
        'archived': 'ARCHIVED'
      };
      filtered = filtered.filter(n => n.status === statusMap[selectedTab]);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        (n.meta?.email && n.meta.email.toLowerCase().includes(query))
      );
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1);
  }, [notifications, selectedTab, searchQuery]);

  const stats = notificationStore.getStats('SECRETARIA');
  const paginatedNotifications = filteredNotifications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'RESET_REQUESTED':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'RESET_IN_PROGRESS':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'RESET_COMPLETED':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'RESET_CANCELLED':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'RESET_REQUESTED':
        return 'Reset Solicitado';
      case 'RESET_IN_PROGRESS':
        return 'Em Andamento';
      case 'RESET_COMPLETED':
        return 'Concluído';
      case 'RESET_CANCELLED':
        return 'Cancelado';
      default:
        return type;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    notificationStore.markRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleSelectNotification = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedNotifications);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedNotifications.map(n => n.id));
      setSelectedNotifications(allIds);
    } else {
      setSelectedNotifications(new Set());
    }
  };

  const handleBulkMarkRead = async () => {
    setIsLoading(true);
    
    selectedNotifications.forEach(id => {
      notificationStore.markRead(id);
    });
    
    toast({
      title: "Notificações marcadas como lidas",
      description: `${selectedNotifications.size} notificações foram marcadas como lidas.`,
    });
    
    setSelectedNotifications(new Set());
    setIsLoading(false);
  };

  const handleBulkArchive = async () => {
    setIsLoading(true);
    
    selectedNotifications.forEach(id => {
      notificationStore.archive(id);
    });
    
    toast({
      title: "Notificações arquivadas",
      description: `${selectedNotifications.size} notificações foram arquivadas.`,
    });
    
    setSelectedNotifications(new Set());
    setIsLoading(false);
  };

  const handleMarkAllRead = () => {
    notificationStore.markAllRead('SECRETARIA');
    toast({
      title: "Todas marcadas como lidas",
      description: "Todas as notificações foram marcadas como lidas.",
    });
  };

  if (!user || user.role !== 'secretaria') {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Centro de Notificações
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as notificações do sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          {stats.unread > 0 && (
            <Button onClick={handleMarkAllRead} variant="outline">
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
          {stats.read > 0 && (
            <Button 
              onClick={() => {
                const readCount = stats.read;
                notificationStore.deleteRead('SECRETARIA');
                toast({
                  title: "Notificações excluídas",
                  description: `${readCount} notificações lidas foram excluídas permanentemente.`,
                });
              }}
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir lidas ({stats.read})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Não lidas</p>
                <p className="text-2xl font-bold text-destructive">{stats.unread}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lidas</p>
                <p className="text-2xl font-bold text-success">{stats.read}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Arquivadas</p>
                <p className="text-2xl font-bold">{stats.archived}</p>
              </div>
              <Archive className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtre e busque nas notificações</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, título ou mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            Todas
            <Badge variant="secondary" className="ml-1">
              {stats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            Não lidas
            {stats.unread > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center gap-2">
            Lidas
            <Badge variant="secondary" className="ml-1">
              {stats.read}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            Arquivadas
            <Badge variant="secondary" className="ml-1">
              {stats.archived}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {/* Bulk Actions */}
          {selectedNotifications.size > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    {selectedNotifications.size} notificação(ões) selecionada(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkMarkRead}
                      disabled={isLoading}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Marcar como lidas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkArchive}
                      disabled={isLoading}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Arquivar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setIsLoading(true);
                        selectedNotifications.forEach(id => {
                          notificationStore.delete(id);
                        });
                        toast({
                          title: "Notificações excluídas",
                          description: `${selectedNotifications.size} notificações foram excluídas permanentemente.`,
                        });
                        setSelectedNotifications(new Set());
                        setIsLoading(false);
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications List */}
          <Card>
            <CardContent className="p-0">
              {paginatedNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma notificação</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nenhuma notificação encontrada para sua busca.' : 'Você não tem notificações nesta categoria.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Select All Header */}
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedNotifications.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        Selecionar todas ({paginatedNotifications.length})
                      </span>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="divide-y">
                    {paginatedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-muted/50 transition-colors ${
                          notification.status === 'UNREAD' ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedNotifications.has(notification.id)}
                            onCheckedChange={(checked) => 
                              handleSelectNotification(notification.id, !!checked)
                            }
                          />
                          
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-medium ${
                                    notification.status === 'UNREAD' ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>
                                    {notification.title}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {getNotificationTypeLabel(notification.type)}
                                  </Badge>
                                  {notification.status === 'UNREAD' && (
                                    <div className="w-2 h-2 bg-primary rounded-full" />
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    {format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                  <span>
                                    {formatDistanceToNow(new Date(notification.createdAt), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                {notification.status === 'UNREAD' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => notificationStore.markRead(notification.id)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => notificationStore.archive(notification.id)}
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                                {notification.status === 'READ' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      notificationStore.delete(notification.id);
                                      toast({
                                        title: "Notificação excluída",
                                        description: "A notificação foi excluída permanentemente.",
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredNotifications.length)} de {filteredNotifications.length} notificações
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Debug Panel - Only show in development or for testing */}
      <NotificationDebugger />
    </div>
  );
}