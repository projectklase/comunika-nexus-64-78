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
import { Switch } from '@/components/ui/switch';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: any;
  onSuccess: () => void;
}

const COLOR_OPTIONS = [
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Verde', value: '#22C55E' },
  { label: 'Roxo', value: '#8B5CF6' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Laranja', value: '#F97316' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Amarelo', value: '#EAB308' },
];

export function SchoolEditModal({ open, onOpenChange, school, onSuccess }: SchoolEditModalProps) {
  const { updateSchool, updatingSchool } = useSuperAdmin();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    primary_color: '#3B82F6',
    is_active: true,
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        slug: school.slug || '',
        logo_url: school.logo_url || '',
        primary_color: school.primary_color || '#3B82F6',
        is_active: school.is_active ?? true,
      });
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!school?.id) return;

    try {
      await updateSchool.mutateAsync({
        schoolId: school.id,
        ...formData,
      });
      toast.success('Escola atualizada com sucesso');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar escola');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Editar Escola
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nome da Escola</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Colégio Exemplo"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/</span>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="colegio-exemplo"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label>URL do Logo</Label>
            <Input
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://..."
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label>Cor Principal</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, primary_color: color.value }))}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.primary_color === color.value
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div>
              <Label className="text-base">Escola Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Escolas inativas não podem ser acessadas por usuários
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
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
            <Button type="submit" disabled={updatingSchool}>
              {updatingSchool && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}