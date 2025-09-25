import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { passwordResetStore, PasswordResetRequest, PasswordResetStatus } from '@/stores/password-reset-store';
import { ResetRequestModal } from './ResetRequestModal';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function PasswordResetsPage() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PasswordResetRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PasswordResetStatus | 'ALL'>('ALL');
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const updateRequests = () => {
      const allRequests = passwordResetStore.list();
      setRequests(allRequests);
      
      // Check if there's a focus param to auto-open specific request
      const focusParam = searchParams.get('focus');
      if (focusParam) {
        const targetRequest = allRequests.find(r => r.id === focusParam);
        if (targetRequest) {
          setSelectedRequest(targetRequest);
          
          // Mark related notification as read
          import('@/stores/notification-store').then(({ notificationStore }) => {
            const notifications = notificationStore.list({
              roleTarget: 'SECRETARIA',
              status: 'UNREAD'
            });
            const relatedNotification = notifications.find(n => n.meta?.requestId === focusParam);
            if (relatedNotification) {
              notificationStore.markRead(relatedNotification.id);
            }
          });
        } else {
          // Show toast if request not found
          setTimeout(() => {
            toast({
              title: "Solicitação não encontrada",
              description: "A solicitação pode ter sido concluída ou não existe mais.",
              variant: "destructive",
            });
          }, 500);
        }
      }
    };

    updateRequests();
    const unsubscribe = passwordResetStore.subscribe(updateRequests);
    return unsubscribe;
  }, [searchParams, toast]);

  useEffect(() => {
    let filtered = [...requests];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.email.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchQuery, statusFilter]);

  const stats = passwordResetStore.getStats();

  const getStatusIcon = (status: PasswordResetStatus) => {
    switch (status) {
      case 'NEW':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'DONE':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'CANCELED':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: PasswordResetStatus) => {
    switch (status) {
      case 'NEW':
        return 'Nova';
      case 'IN_PROGRESS':
        return 'Em andamento';
      case 'DONE':
        return 'Concluída';
      case 'CANCELED':
        return 'Cancelada';
    }
  };

  const getStatusColor = (status: PasswordResetStatus) => {
    switch (status) {
      case 'NEW':
        return 'destructive';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'DONE':
        return 'default';
      case 'CANCELED':
        return 'outline';
    }
  };

  const refreshData = () => {
    const allRequests = passwordResetStore.list();
    setRequests(allRequests);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Centro de Resets</h1>
          <p className="text-muted-foreground">
            Gerenciar solicitações de redefinição de senha
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Email ou observações..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PasswordResetStatus | 'ALL')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="NEW">Novas</SelectItem>
                      <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                      <SelectItem value="DONE">Concluídas</SelectItem>
                      <SelectItem value="CANCELED">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={refreshData} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Novas</span>
                  <Badge variant="destructive">{stats.newRequests}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Em andamento</span>
                  <Badge variant="secondary">{stats.inProgress}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Concluídas</span>
                  <Badge variant="default">{stats.completed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Canceladas</span>
                  <Badge variant="outline">{stats.canceled}</Badge>
                </div>
                <div className="border-t pt-3 flex justify-between items-center font-medium">
                  <span className="text-sm">Total</span>
                  <span>{stats.total}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações de Reset</CardTitle>
                <CardDescription>
                  {filteredRequests.length} de {requests.length} solicitações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma solicitação encontrada</h3>
                    <p className="text-muted-foreground">
                      {requests.length === 0 
                        ? 'Ainda não há solicitações de reset de senha.'
                        : 'Tente ajustar os filtros para encontrar o que procura.'
                      }
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead>Processado</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {request.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(request.status)}
                              <Badge variant={getStatusColor(request.status)}>
                                {getStatusLabel(request.status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="space-y-1">
                              <div>{format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                              <div className="text-xs">
                                {formatDistanceToNow(new Date(request.createdAt), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.processedAt ? (
                              <div className="space-y-1">
                                <div>{format(new Date(request.processedAt), 'dd/MM/yyyy HH:mm')}</div>
                                <div className="text-xs">
                                  {formatDistanceToNow(new Date(request.processedAt), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Abrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedRequest && (
        <ResetRequestModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onComplete={() => {
            setSelectedRequest(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}