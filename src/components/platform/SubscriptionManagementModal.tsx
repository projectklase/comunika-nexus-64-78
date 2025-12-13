import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/app-dialog/ConfirmDialog';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Calendar, Building2, Users, Percent, Tag, Receipt, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SubscriptionManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: any;
  onSuccess: () => void;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

export function SubscriptionManagementModal({ 
  open, 
  onOpenChange, 
  admin, 
  onSuccess 
}: SubscriptionManagementModalProps) {
  const { subscriptionPlans, loadingPlans, updateSubscription, updatingSubscription } = useSuperAdmin();
  const [formData, setFormData] = useState({
    plan_id: '',
    status: 'active',
    addon_schools_count: 0,
    trial_ends_at: '',
    expires_at: '',
    discount_percent: 0,
    discount_cents: 0,
    discount_reason: '',
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelingStripe, setCancelingStripe] = useState(false);

  useEffect(() => {
    if (admin?.subscription) {
      const sub = admin.subscription;
      const plan = subscriptionPlans?.find(p => p.slug === sub.plan_slug);
      
      setFormData({
        plan_id: plan?.id || '',
        status: sub.status || 'active',
        addon_schools_count: sub.addon_schools || 0,
        trial_ends_at: sub.trial_ends_at ? format(new Date(sub.trial_ends_at), "yyyy-MM-dd'T'HH:mm") : '',
        expires_at: sub.expires_at ? format(new Date(sub.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
        discount_percent: sub.discount_percent || 0,
        discount_cents: sub.discount_cents || 0,
        discount_reason: sub.discount_reason || '',
      });
    } else {
      setFormData({
        plan_id: subscriptionPlans?.[0]?.id || '',
        status: 'active',
        addon_schools_count: 0,
        trial_ends_at: '',
        expires_at: '',
        discount_percent: 0,
        discount_cents: 0,
        discount_reason: '',
      });
    }
  }, [admin, subscriptionPlans]);

  const selectedPlan = subscriptionPlans?.find(p => p.id === formData.plan_id);
  const currentStatus = admin?.subscription?.status;
  const isChangingToCanceled = formData.status === 'canceled' && currentStatus !== 'canceled';

  // Calculate costs with discounts
  const costBreakdown = useMemo(() => {
    if (!selectedPlan) return null;

    const baseCost = selectedPlan.price_cents;
    const addonCost = formData.addon_schools_count * (selectedPlan.addon_school_price_cents || 49700);
    const subtotal = baseCost + addonCost;
    
    const percentDiscount = Math.round(subtotal * (formData.discount_percent / 100));
    const fixedDiscount = formData.discount_cents;
    const totalDiscount = percentDiscount + fixedDiscount;
    
    const finalTotal = Math.max(0, subtotal - totalDiscount);

    return {
      baseCost,
      addonCost,
      subtotal,
      percentDiscount,
      fixedDiscount,
      totalDiscount,
      finalTotal,
    };
  }, [selectedPlan, formData.addon_schools_count, formData.discount_percent, formData.discount_cents]);

  const handleCancelStripeSubscription = async () => {
    setCancelingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-stripe-subscription', {
        body: { admin_id: admin.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Assinatura cancelada no Stripe com sucesso');
      setShowCancelConfirm(false);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error canceling Stripe subscription:', error);
      toast.error(error.message || 'Erro ao cancelar assinatura no Stripe');
    } finally {
      setCancelingStripe(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!admin?.id || !formData.plan_id) {
      toast.error('Selecione um plano');
      return;
    }

    // If changing to canceled, show confirmation modal
    if (isChangingToCanceled) {
      setShowCancelConfirm(true);
      return;
    }

    // Validate discount reason if discount is applied
    if ((formData.discount_percent > 0 || formData.discount_cents > 0) && !formData.discount_reason.trim()) {
      toast.error('Informe o motivo do desconto');
      return;
    }

    try {
      await updateSubscription.mutateAsync({
        adminId: admin.id,
        planId: formData.plan_id,
        status: formData.status,
        addonSchoolsCount: formData.addon_schools_count,
        trialEndsAt: formData.trial_ends_at || null,
        expiresAt: formData.expires_at || null,
        discountPercent: formData.discount_percent,
        discountCents: formData.discount_cents,
        discountReason: formData.discount_reason || null,
      });
      toast.success('Assinatura atualizada com sucesso');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar assinatura');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-card border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Gerenciar Assinatura
          </DialogTitle>
        </DialogHeader>

        {admin && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {admin.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">{admin.name}</p>
                <p className="text-sm text-muted-foreground">{admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {admin.schools_count} escolas
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {admin.total_students} alunos
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select 
              value={formData.plan_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, plan_id: value }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {loadingPlans ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  subscriptionPlans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price_cents)}/mês
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <p className="text-xs text-muted-foreground">
                {selectedPlan.max_students} alunos • {selectedPlan.included_schools} escola(s) incluída(s)
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
                <SelectItem value="past_due">Pagamento Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Addon Schools */}
          <div className="space-y-2">
            <Label>Escolas Adicionais</Label>
            <Input
              type="number"
              min="0"
              value={formData.addon_schools_count}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                addon_schools_count: parseInt(e.target.value) || 0 
              }))}
              className="bg-white/5 border-white/10"
            />
            {selectedPlan && formData.addon_schools_count > 0 && (
              <p className="text-xs text-muted-foreground">
                +{formatCurrency(selectedPlan.addon_school_price_cents * formData.addon_schools_count)}/mês
              </p>
            )}
          </div>

          {/* Discount Section */}
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Tag className="w-4 h-4" />
              <Label className="text-purple-400 font-medium">Desconto Negociado</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Percentual
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discount_percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    }))}
                    className="bg-white/5 border-white/10 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Valor Fixo (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(formData.discount_cents / 100).toFixed(2)}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    discount_cents: Math.max(0, Math.round(parseFloat(e.target.value) * 100) || 0)
                  }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Motivo do Desconto *</Label>
              <Textarea
                value={formData.discount_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_reason: e.target.value }))}
                placeholder="Ex: Parceria com prefeitura, negociação especial..."
                className="bg-white/5 border-white/10 min-h-[60px] resize-none"
              />
            </div>
          </div>

          {/* Cost Summary */}
          {costBreakdown && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-primary" />
                <Label className="font-medium">Resumo do Valor</Label>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano {selectedPlan?.name}</span>
                  <span>{formatCurrency(costBreakdown.baseCost)}</span>
                </div>
                
                {costBreakdown.addonCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">+ {formData.addon_schools_count} escola(s) adicional(is)</span>
                    <span>{formatCurrency(costBreakdown.addonCost)}</span>
                  </div>
                )}
                
                {costBreakdown.percentDiscount > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>- Desconto ({formData.discount_percent}%)</span>
                    <span>-{formatCurrency(costBreakdown.percentDiscount)}</span>
                  </div>
                )}
                
                {costBreakdown.fixedDiscount > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>- Desconto fixo</span>
                    <span>-{formatCurrency(costBreakdown.fixedDiscount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-base">
                  <span>Total Mensal</span>
                  <span className="text-emerald-400">{formatCurrency(costBreakdown.finalTotal)}</span>
                </div>

                {costBreakdown.totalDiscount > 0 && (
                  <p className="text-xs text-purple-400 text-right">
                    Economia: {formatCurrency(costBreakdown.totalDiscount)}/mês
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Trial End Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fim do Trial (opcional)
            </Label>
            <Input
              type="datetime-local"
              value={formData.trial_ends_at}
              onChange={(e) => setFormData(prev => ({ ...prev, trial_ends_at: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Expiração (opcional)
            </Label>
            <Input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Warning when changing to canceled */}
          {isChangingToCanceled && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Atenção: Cancelamento de Assinatura</p>
                <p className="text-muted-foreground mt-1">
                  Ao confirmar, a cobrança recorrente no Stripe será cancelada e o cliente não será mais cobrado.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white/5 border-white/10"
            >
              Fechar
            </Button>
            <Button type="submit" disabled={updatingSubscription} variant={isChangingToCanceled ? "destructive" : "default"}>
              {updatingSubscription && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isChangingToCanceled ? 'Cancelar Assinatura' : (admin?.subscription ? 'Atualizar' : 'Criar')} {!isChangingToCanceled && 'Assinatura'}
            </Button>
          </DialogFooter>
        </form>

        {/* Confirmation dialog for Stripe cancellation */}
        <ConfirmDialog
          open={showCancelConfirm}
          onOpenChange={setShowCancelConfirm}
          title="Confirmar Cancelamento"
          description={`Tem certeza que deseja cancelar a assinatura de ${admin?.name}? Isso irá encerrar a cobrança recorrente no Stripe imediatamente. Esta ação não pode ser desfeita facilmente.`}
          confirmText={cancelingStripe ? "Cancelando..." : "Sim, Cancelar Assinatura"}
          cancelText="Voltar"
          onConfirm={handleCancelStripeSubscription}
          variant="destructive"
          isAsync={true}
          loading={cancelingStripe}
        />
      </DialogContent>
    </Dialog>
  );
}