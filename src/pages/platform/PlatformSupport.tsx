import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Ticket, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  Loader2
} from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  admin: { id: string; name: string; email: string } | null;
  school: { id: string; name: string } | null;
}

interface TicketAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  normal: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
};

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string | null) => {
  if (!type) return File;
  if (type.startsWith('image/')) return ImageIcon;
  if (type === 'application/pdf') return FileText;
  return File;
};

export default function PlatformSupport() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_tickets', {
        p_status: statusFilter === 'all' ? null : statusFilter,
        p_priority: priorityFilter === 'all' ? null : priorityFilter,
      });
      if (error) throw error;
      return (data as unknown as SupportTicket[]) || [];
    },
  });

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ['ticket-attachments', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const { data, error } = await supabase
        .from('support_ticket_attachments')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TicketAttachment[];
    },
    enabled: !!selectedTicket?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status, notes }: { ticketId: string; status: string; notes?: string }) => {
      const { error } = await supabase.rpc('update_ticket_status', {
        p_ticket_id: ticketId,
        p_status: status,
        p_resolution_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Status atualizado');
      setSelectedTicket(null);
      setResolutionNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleDownload = async (attachment: TicketAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .createSignedUrl(attachment.file_url, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const filteredTickets = tickets.filter(ticket => 
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suporte</h1>
          <p className="text-muted-foreground">Gerenciamento de tickets de suporte</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Ticket className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-background/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px] bg-background/50">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ticket encontrado
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-border/50 bg-background/30 hover:bg-background/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{ticket.subject}</h3>
                        <Badge className={priorityColors[ticket.priority]}>
                          {priorityLabels[ticket.priority]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{ticket.admin?.name || 'N/A'}</span>
                        <span>{ticket.school?.name || 'N/A'}</span>
                        <span>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <Badge className={statusColors[ticket.status]}>
                      {statusLabels[ticket.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedTicket.status]}>
                  {statusLabels[selectedTicket.status]}
                </Badge>
                <Badge className={priorityColors[selectedTicket.priority]}>
                  {priorityLabels[selectedTicket.priority]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Admin:</span>
                  <p className="font-medium">{selectedTicket.admin?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.admin?.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Escola:</span>
                  <p className="font-medium">{selectedTicket.school?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Criado em:</span>
                  <p className="font-medium">
                    {format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {selectedTicket.resolved_at && (
                  <div>
                    <span className="text-muted-foreground">Resolvido em:</span>
                    <p className="font-medium">
                      {format(new Date(selectedTicket.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Descrição:</span>
                <p className="mt-1 p-3 rounded-lg bg-muted/50 text-sm">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Attachments Section */}
              {attachmentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando anexos...
                </div>
              ) : attachments.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <Paperclip className="h-4 w-4" />
                    Anexos ({attachments.length})
                  </span>
                  <div className="space-y-2">
                    {attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.file_type);
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                        >
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.file_size)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(attachment)}
                            className="shrink-0"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedTicket.resolution_notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notas de Resolução:</span>
                  <p className="mt-1 p-3 rounded-lg bg-green-500/10 text-sm">
                    {selectedTicket.resolution_notes}
                  </p>
                </div>
              )}

              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <div>
                  <span className="text-sm text-muted-foreground">Notas de Resolução:</span>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Adicione notas sobre a resolução..."
                    className="mt-1"
                  />
                </div>
              )}

              <DialogFooter className="flex-wrap gap-2">
                {selectedTicket.status === 'open' && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ 
                      ticketId: selectedTicket.id, 
                      status: 'in_progress' 
                    })}
                  >
                    Iniciar Atendimento
                  </Button>
                )}
                {selectedTicket.status === 'in_progress' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ 
                      ticketId: selectedTicket.id, 
                      status: 'resolved',
                      notes: resolutionNotes 
                    })}
                  >
                    Marcar como Resolvido
                  </Button>
                )}
                {selectedTicket.status === 'resolved' && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ 
                      ticketId: selectedTicket.id, 
                      status: 'closed' 
                    })}
                  >
                    Fechar Ticket
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
