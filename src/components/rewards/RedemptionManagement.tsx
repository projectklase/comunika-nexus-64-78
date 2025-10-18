import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RedemptionRequest } from '@/types/rewards';
import { useRewardsStore } from '@/stores/rewards-store';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RedemptionFilters } from './RedemptionFilters';

export function RedemptionManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { redemptions, approveRedemption, rejectRedemption, items, loadRedemptions } = useRewardsStore();
  
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load redemptions on mount
  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  // Filter redemptions
  const filteredRedemptions = redemptions.filter(r => {
    const matchesSearch = searchTerm === '' || 
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.studentName && r.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingRedemptions = filteredRedemptions.filter(r => r.status === 'PENDING');

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  const handleApprove = async (redemptionId: string) => {
    if (!user) return;
    
    const redemption = redemptions.find(r => r.id === redemptionId);
    const result = await approveRedemption(redemptionId, user.id);
    
    if (result.success && redemption) {
      console.log('[RedemptionManagement] Aprovação bem-sucedida, criando notificação para aluno:', redemption.studentId);
      
      // Criar notificação para o aluno usando service_role via edge function
      try {
        const notificationResponse = await supabase.functions.invoke('create-notification', {
          body: {
            user_id: redemption.studentId,
            type: 'REDEMPTION_APPROVED',
            title: 'Resgate Aprovado! 🎉',
            message: `Seu resgate de "${redemption.itemName}" foi aprovado! Você pode retirar seu prêmio.`,
            link: '/aluno/loja-recompensas?tab=history',
            role_target: 'aluno',
            meta: {
              redemptionId,
              itemName: redemption.itemName,
              koinAmount: redemption.koinAmount,
              approvedBy: user.name,
              approvedAt: new Date().toISOString()
            }
          }
        });
        
        if (notificationResponse.error) {
          console.error('[RedemptionManagement] Erro ao criar notificação:', notificationResponse.error);
        } else {
          console.log('[RedemptionManagement] Notificação de aprovação criada com sucesso');
        }
      } catch (error) {
        console.error('[RedemptionManagement] Exceção ao criar notificação:', error);
        // Don't fail approval if notification fails
      }

      toast({
        title: "Resgate aprovado!",
        description: result.message,
        duration: 3000
      });
    } else {
      toast({
        title: "Erro ao aprovar",
        description: result.message,
        variant: "destructive",
        duration: 4000
      });
    }
  };

  const handleReject = async () => {
    if (!user || !rejectingId || !rejectionReason.trim()) return;
    
    const redemption = redemptions.find(r => r.id === rejectingId);
    const result = await rejectRedemption(rejectingId, user.id, rejectionReason.trim());
    
    if (redemption) {
      console.log('[RedemptionManagement] Rejeição bem-sucedida, criando notificação para aluno:', redemption.studentId);
      
      // Criar notificação para o aluno usando service_role via edge function
      try {
        const notificationResponse = await supabase.functions.invoke('create-notification', {
          body: {
            user_id: redemption.studentId,
            type: 'REDEMPTION_REJECTED',
            title: 'Resgate Recusado',
            message: `Seu resgate de "${redemption.itemName}" foi recusado. Motivo: ${rejectionReason}. Seus Koins foram reembolsados.`,
            link: '/aluno/loja-recompensas?tab=history',
            role_target: 'aluno',
            meta: {
              redemptionId: rejectingId,
              itemName: redemption.itemName,
              koinAmount: redemption.koinAmount,
              rejectedBy: user.name,
              rejectedAt: new Date().toISOString(),
              reason: rejectionReason
            }
          }
        });
        
        if (notificationResponse.error) {
          console.error('[RedemptionManagement] Erro ao criar notificação:', notificationResponse.error);
        } else {
          console.log('[RedemptionManagement] Notificação de rejeição criada com sucesso');
        }
      } catch (error) {
        console.error('[RedemptionManagement] Exceção ao criar notificação:', error);
        // Don't fail rejection if notification fails
      }
    }
    
    toast({
      title: "Resgate recusado",
      description: "O aluno foi notificado sobre a recusa.",
      duration: 3000
    });
    
    setRejectingId(null);
    setRejectionReason('');
  };

  const getStatusBadge = (status: RedemptionRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/10">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">
            <XCircle className="h-3 w-3 mr-1" />
            Recusado
          </Badge>
        );
    }
  };

  const getItemById = (itemId: string) => {
    return items.find(item => item.id === itemId);
  };

  const canApprove = (redemption: RedemptionRequest) => {
    const item = getItemById(redemption.itemId);
    return item && item.isActive && item.stock > 0;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <RedemptionFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Pending Redemptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Resgates Pendentes ({pendingRedemptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRedemptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum resgate pendente no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRedemptions.map((redemption) => {
                const item = getItemById(redemption.itemId);
                const canApproveThis = canApprove(redemption);
                
                return (
                  <div
                    key={redemption.id}
                    className="flex items-start gap-4 p-4 bg-muted/5 rounded-lg border border-border/50"
                  >
                    {/* Item Image */}
                    <img
                      src={item?.images[0] || '/placeholder.svg'}
                      alt={redemption.itemName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {redemption.itemName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Solicitado em {format(new Date(redemption.requestedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        {getStatusBadge(redemption.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{redemption.koinAmount} Koins</span>
                        </div>
                        {item && (
                          <div className="text-muted-foreground">
                            Estoque atual: {item.stock}
                          </div>
                        )}
                      </div>

                      {!canApproveThis && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            {!item ? 'Item removido' : 'Sem estoque disponível'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleApprove(redemption.id)}
                        disabled={!canApproveThis}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectingId(redemption.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      <Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Resgate</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Por favor, forneça uma justificativa para a recusa. Esta mensagem será enviada ao aluno.
            </p>
            
            <Textarea
              placeholder="Ex: Item temporariamente indisponível..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectingId(null);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Recusar Resgate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}