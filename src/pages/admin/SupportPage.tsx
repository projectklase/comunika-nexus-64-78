import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeadphonesIcon, Plus, Clock, CheckCircle2, AlertCircle, Loader2, MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  OPEN: { label: 'Aberto', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Loader2 },
  RESOLVED: { label: 'Resolvido', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
  CLOSED: { label: 'Fechado', color: 'bg-muted text-muted-foreground border-border', icon: CheckCircle2 },
};

const priorityConfig = {
  LOW: { label: 'Normal', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  MEDIUM: { label: 'Alta', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  HIGH: { label: 'Urgente', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function SupportPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

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
                const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.OPEN;
                const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.LOW;
                const StatusIcon = status.icon;

                return (
                  <Card key={ticket.id} className="glass-card hover:border-purple-500/30 transition-colors duration-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={cn('text-xs', status.color)}>
                              <StatusIcon className={cn('h-3 w-3 mr-1', status.icon === Loader2 && 'animate-spin')} />
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className={cn('text-xs', priority.color)}>
                              {priority.label}
                            </Badge>
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
                      
                      {ticket.resolution_notes && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Resposta do Suporte:</p>
                          <p className="text-sm text-foreground">{ticket.resolution_notes}</p>
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
