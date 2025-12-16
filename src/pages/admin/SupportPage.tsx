import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeadphonesIcon, Plus, Clock, CheckCircle2, AlertCircle, Loader2, MessageSquare, Calendar, Paperclip, Download, FileText, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Use lowercase to match database values
const statusConfig = {
  open: { label: 'Aberto', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Loader2 },
  resolved: { label: 'Resolvido', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
  closed: { label: 'Fechado', color: 'bg-muted text-muted-foreground border-border', icon: CheckCircle2 },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  normal: { label: 'Normal', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  high: { label: 'Alta', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface TicketAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
}

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

export default function SupportPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: attachmentsMap = {} } = useQuery({
    queryKey: ['ticket-attachments-map', tickets?.map(t => t.id)],
    queryFn: async () => {
      if (!tickets || tickets.length === 0) return {};
      
      const { data, error } = await supabase
        .from('support_ticket_attachments')
        .select('*')
        .in('ticket_id', tickets.map(t => t.id));

      if (error) throw error;

      // Group by ticket_id
      const map: Record<string, TicketAttachment[]> = {};
      (data || []).forEach((att) => {
        if (!map[att.ticket_id]) {
          map[att.ticket_id] = [];
        }
        map[att.ticket_id].push(att);
      });
      return map;
    },
    enabled: !!tickets && tickets.length > 0,
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

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <HeadphonesIcon className="h-7 w-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Suporte</h1>
              <p className="text-sm text-muted-foreground">Central de ajuda e atendimento</p>
            </div>
          </div>
          
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Ticket
          </Button>
        </div>

        {/* Info Card */}
        <Card className="glass-card border-purple-500/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-purple-400 mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Precisa de ajuda?</p>
                <p>
                  Nossa equipe de suporte está disponível para ajudá-lo com dúvidas, 
                  problemas técnicos ou sugestões. Tempo médio de resposta: <strong className="text-foreground">até 24 horas úteis</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            Meus Tickets
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open;
                const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                const StatusIcon = status.icon;
                const ticketAttachments = attachmentsMap[ticket.id] || [];
                const isExpanded = expandedTicketId === ticket.id;

                return (
                  <Card 
                    key={ticket.id} 
                    className="glass-card hover:border-purple-500/30 transition-colors duration-200 cursor-pointer"
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className={cn('text-xs', status.color)}>
                              <StatusIcon className={cn('h-3 w-3 mr-1', status.icon === Loader2 && 'animate-spin')} />
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className={cn('text-xs', priority.color)}>
                              {priority.label}
                            </Badge>
                            {ticketAttachments.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-muted/50">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {ticketAttachments.length}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground truncate">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(ticket.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      
                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-3" onClick={(e) => e.stopPropagation()}>
                          {/* Attachments */}
                          {ticketAttachments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                Anexos
                              </p>
                              <div className="space-y-2">
                                {ticketAttachments.map((attachment) => {
                                  const FileIcon = getFileIcon(attachment.file_type);
                                  return (
                                    <div
                                      key={attachment.id}
                                      className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50"
                                    >
                                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{attachment.file_name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(attachment)}
                                        className="h-7 px-2"
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Resolution notes */}
                          {ticket.resolution_notes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Resposta do Suporte:</p>
                              <p className="text-sm text-foreground p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                {ticket.resolution_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="glass-card border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Nenhum ticket ainda</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Você ainda não abriu nenhum ticket de suporte. Clique no botão abaixo se precisar de ajuda.
                </p>
                <Button
                  onClick={() => setModalOpen(true)}
                  variant="outline"
                  className="border-purple-500/30 hover:bg-purple-500/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir Primeiro Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <SupportTicketModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={() => refetch()}
        />
      </div>
    </AppLayout>
  );
}
