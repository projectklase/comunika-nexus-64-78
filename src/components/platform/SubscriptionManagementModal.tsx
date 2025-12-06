import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, CreditCard, Calendar, Building2, Users } from 'lucide-react';
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
  });

  useEffect(() => {
    if (admin?.subscription) {
      const sub = admin.subscription;
      // Find plan ID from plans list
      const plan = subscriptionPlans?.find(p => p.slug === sub.plan_slug);
      
      setFormData({
        plan_id: plan?.id || '',
        status: sub.status || 'active',
        addon_schools_count: sub.addon_schools || 0,
        trial_ends_at: sub.trial_ends_at ? format(new Date(sub.trial_ends_at), "yyyy-MM-dd'T'HH:mm") : '',
        expires_at: sub.expires_at ? format(new Date(sub.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      });
    } else {
      setFormData({
        plan_id: subscriptionPlans?.[0]?.id || '',
        status: 'active',
        addon_schools_count: 0,
        trial_ends_at: '',
        expires_at: '',
      });
    }
  }, [admin, subscriptionPlans]);

  const selectedPlan = subscriptionPlans?.find(p => p.id === formData.plan_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!admin?.id || !formData.plan_id) {
      toast.error('Selecione um plano');
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
      });
      toast.success('Assinatura atualizada com sucesso');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar assinatura');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-card border-white/10">
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

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white/5 border-white/10"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updatingSubscription}>
              {updatingSubscription && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {admin?.subscription ? 'Atualizar' : 'Criar'} Assinatura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}