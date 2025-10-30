import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Challenge } from '@/hooks/useChallenges';

const ACTION_TARGETS = [
  { value: 'READ_POST', label: 'Ler postagem' },
  { value: 'SUBMIT_ACTIVITY', label: 'Entregar atividade' },
  { value: 'COMMENT_POST', label: 'Comentar postagem' },
  { value: 'LIKE_POST', label: 'Curtir postagem' },
  { value: 'SHARE_POST', label: 'Compartilhar postagem' },
  { value: 'LOGIN_STREAK', label: 'Dias de login consecutivos' },
  { value: 'PERFECT_SCORE', label: 'Nota perfeita' },
];

const CHALLENGE_TYPES = [
  { value: 'DAILY', label: 'Diário' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'ACHIEVEMENT', label: 'Conquista' },
];

const ICON_OPTIONS = [
  'target', 'trophy', 'star', 'flame', 'zap', 'award', 
  'medal', 'crown', 'sparkles', 'rocket', 'heart', 'book'
];

interface ChallengeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Challenge, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  challenge?: Challenge | null;
}

export function ChallengeFormModal({ isOpen, onClose, onSubmit, challenge }: ChallengeFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'DAILY' as Challenge['type'],
    action_target: 'READ_POST',
    action_count: 1,
    koin_reward: 10,
    icon_name: 'target',
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (challenge) {
      setFormData({
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        action_target: challenge.action_target,
        action_count: challenge.action_count,
        koin_reward: challenge.koin_reward,
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
        icon_name: 'target',
        is_active: true,
      });
    }
  }, [challenge, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action_count">Quantidade</Label>
              <Input
                id="action_count"
                type="number"
                min="1"
                value={formData.action_count}
                onChange={(e) => setFormData({ ...formData, action_count: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="koin_reward">Recompensa (Koins)</Label>
              <Input
                id="koin_reward"
                type="number"
                min="1"
                value={formData.koin_reward}
                onChange={(e) => setFormData({ ...formData, koin_reward: parseInt(e.target.value) })}
                required
              />
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
                  {ICON_OPTIONS.map(icon => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : challenge ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
