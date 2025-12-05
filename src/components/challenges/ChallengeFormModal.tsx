import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Challenge } from '@/hooks/useChallenges';
import { ACTION_TARGET_LABELS, CHALLENGE_TYPE_LABELS, ICON_LABELS } from '@/constants/challenge-labels';
import { 
  getXPLimit, 
  getXPSuggestion, 
  isXPWithinLimit, 
  XP_ECONOMY_HINTS,
  getMinActionCount,
  isActionCountValid,
  getTypeDescription,
  calculateXPEfficiency
} from '@/constants/xp-limits';
import { useToast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';

// Usar constantes do arquivo challenge-labels.ts
const ACTION_TARGETS = Object.entries(ACTION_TARGET_LABELS).map(([value, label]) => ({ value, label }));
const CHALLENGE_TYPES = Object.entries(CHALLENGE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const ICON_OPTIONS = Object.keys(ICON_LABELS);

interface ChallengeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Challenge, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  challenge?: Challenge | null;
}

export function ChallengeFormModal({ isOpen, onClose, onSubmit, challenge }: ChallengeFormModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'DAILY' as Challenge['type'],
    action_target: 'READ_POST',
    action_count: 1,
    koin_reward: 10,
    xp_reward: 10,
    icon_name: 'target',
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);

  // Limites e sugestões baseados no tipo selecionado
  const xpLimit = getXPLimit(formData.type);
  const xpSuggestion = getXPSuggestion(formData.type);
  const isXPOverLimit = formData.xp_reward > xpLimit;
  
  // Quantidade mínima e validação
  const minActionCount = getMinActionCount(formData.type);
  const isActionCountBelowMin = formData.action_count < minActionCount;
  const typeDescription = getTypeDescription(formData.type);
  
  // Eficiência de XP (para feedback visual)
  const xpEfficiency = calculateXPEfficiency(formData.xp_reward, formData.action_count);

  useEffect(() => {
    if (challenge) {
      setFormData({
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        action_target: challenge.action_target,
        action_count: challenge.action_count,
        koin_reward: challenge.koin_reward,
        xp_reward: challenge.xp_reward ?? 0,
        icon_name: challenge.icon_name,
        is_active: challenge.is_active,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'DAILY',
        action_target: 'READ_POST',
        action_count: 1,
        koin_reward: 10,
        xp_reward: 10,
        icon_name: 'target',
        is_active: true,
      });
    }
  }, [challenge, isOpen]);

  // Ajustar XP e quantidade automaticamente se mudar o tipo
  useEffect(() => {
    setFormData(prev => {
      const newXpLimit = getXPLimit(prev.type);
      const newMinActionCount = getMinActionCount(prev.type);
      
      return {
        ...prev,
        xp_reward: prev.xp_reward > newXpLimit ? newXpLimit : prev.xp_reward,
        action_count: prev.action_count < newMinActionCount ? newMinActionCount : prev.action_count,
      };
    });
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação: pelo menos uma recompensa deve ser > 0
    if (formData.koin_reward <= 0 && formData.xp_reward <= 0) {
      toast({
        title: 'Recompensa obrigatória',
        description: 'O desafio deve ter pelo menos uma recompensa (Koins ou XP) maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    // Validação: XP dentro do limite
    if (!isXPWithinLimit(formData.type, formData.xp_reward)) {
      toast({
        title: 'XP acima do limite',
        description: `Desafios ${CHALLENGE_TYPE_LABELS[formData.type]} podem dar no máximo ${xpLimit} XP.`,
        variant: 'destructive',
      });
      return;
    }

    // Validação: quantidade mínima de ações
    if (!isActionCountValid(formData.type, formData.action_count)) {
      toast({
        title: 'Quantidade insuficiente',
        description: `Desafios ${CHALLENGE_TYPE_LABELS[formData.type]} requerem no mínimo ${minActionCount} ações.`,
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting challenge:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {challenge ? 'Editar Desafio' : 'Novo Desafio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Primeira Leitura do Dia"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o desafio..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: Challenge['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHALLENGE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Descrição do tipo selecionado */}
              {typeDescription && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Icons.Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {typeDescription}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="action_target">Ação</Label>
              <Select
                value={formData.action_target}
                onValueChange={(value) => setFormData({ ...formData, action_target: value })}
              >
                <SelectTrigger id="action_target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TARGETS.map(action => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action_count" className="flex items-center justify-between">
                <span>Quantidade</span>
                <span className="text-xs text-muted-foreground font-normal">
                  mín: {minActionCount}
                </span>
              </Label>
              <Input
                id="action_count"
                type="number"
                min={minActionCount}
                value={formData.action_count}
                onChange={(e) => setFormData({ ...formData, action_count: parseInt(e.target.value) || minActionCount })}
                className={isActionCountBelowMin ? 'border-destructive' : ''}
                required
              />
              {isActionCountBelowMin && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <Icons.AlertCircle className="h-3 w-3" />
                  Mínimo {minActionCount} para {CHALLENGE_TYPE_LABELS[formData.type]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon_name">Ícone</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger id="icon_name">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(iconKey => {
                    const IconComponent = Icons[iconKey.charAt(0).toUpperCase() + iconKey.slice(1) as keyof typeof Icons] as any;
                    const label = ICON_LABELS[iconKey as keyof typeof ICON_LABELS];
                    return (
                      <SelectItem key={iconKey} value={iconKey}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recompensas separadas */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Recompensas</Label>
            <p className="text-xs text-muted-foreground">
              Deixe 0 para não dar esse tipo de recompensa. Pelo menos uma deve ser maior que zero.
            </p>
            
            {/* Dica de economia */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
              <Icons.Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
              <span>{XP_ECONOMY_HINTS[0]}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="koin_reward" className="flex items-center gap-2">
                  <Icons.Sparkles className="h-4 w-4 text-yellow-500" />
                  Koins
                </Label>
                <Input
                  id="koin_reward"
                  type="number"
                  min="0"
                  value={formData.koin_reward}
                  onChange={(e) => setFormData({ ...formData, koin_reward: parseInt(e.target.value) || 0 })}
                  className="border-yellow-500/30 focus:border-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="xp_reward" className="flex items-center gap-2">
                  <Icons.Star className="h-4 w-4 text-blue-400" />
                  XP
                  <span className="text-xs text-muted-foreground ml-auto">
                    máx: {xpLimit}
                  </span>
                </Label>
                <Input
                  id="xp_reward"
                  type="number"
                  min="0"
                  max={xpLimit}
                  value={formData.xp_reward}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, xp_reward: Math.min(value, xpLimit) });
                  }}
                  className={`border-blue-400/30 focus:border-blue-400 ${isXPOverLimit ? 'border-destructive' : ''}`}
                />
                {/* Sugestão contextual */}
                {xpSuggestion && (
                  <p className="text-xs text-muted-foreground">
                    {xpSuggestion.label}
                  </p>
                )}
              </div>
            </div>

            {/* Estimativa de eficiência */}
            {formData.xp_reward > 0 && formData.action_count > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/10 text-xs text-blue-400 border border-blue-500/20">
                <Icons.Calculator className="h-4 w-4 shrink-0" />
                <span>
                  Eficiência: <strong>{xpEfficiency} XP/ação</strong>
                  {xpEfficiency > 30 && (
                    <span className="text-yellow-500 ml-2">
                      ⚠️ Alto - considere reduzir
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active">Desafio ativo</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || isActionCountBelowMin || isXPOverLimit}>
              {submitting ? 'Salvando...' : challenge ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
