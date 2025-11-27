import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { School } from '@/types/school';
import { Loader2 } from 'lucide-react';

interface SchoolFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: School | null;
  onSubmit: (data: any) => Promise<void>;
}

const COLOR_OPTIONS = [
  { label: 'Violeta', value: '#8b5cf6', color: 'bg-purple-500' },
  { label: 'Verde', value: '#10b981', color: 'bg-green-500' },
  { label: 'Azul', value: '#3b82f6', color: 'bg-blue-500' },
  { label: 'Laranja', value: '#f97316', color: 'bg-orange-500' },
  { label: 'Rosa', value: '#ec4899', color: 'bg-pink-500' },
  { label: 'Vermelho', value: '#ef4444', color: 'bg-red-500' },
];

export function SchoolFormModal({ open, onOpenChange, school, onSubmit }: SchoolFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    primary_color: COLOR_OPTIONS[0].value
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name,
        slug: school.slug,
        logo_url: school.logo_url || '',
        primary_color: school.primary_color || COLOR_OPTIONS[0].value
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        logo_url: '',
        primary_color: COLOR_OPTIONS[0].value
      });
    }
  }, [school, open]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: school ? prev.slug : generateSlug(name)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.slug.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting school form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {school ? 'Editar Escola' : 'Nova Escola'}
          </DialogTitle>
          <DialogDescription>
            {school 
              ? 'Atualize as informações da escola' 
              : 'Crie uma nova unidade escolar no sistema'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Escola *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Colégio ABC"
              className="glass-input"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identificador único) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="colegio-abc"
              className="glass-input"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              ⓘ Usado em URLs e identificação interna
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">URL do Logo (opcional)</Label>
            <Input
              id="logo_url"
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://..."
              className="glass-input"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor Primária</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, primary_color: colorOption.value }))}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                    ${formData.primary_color === colorOption.value 
                      ? 'border-primary bg-primary/10 scale-105' 
                      : 'border-border/50 hover:border-border hover:bg-accent/50'
                    }
                  `}
                  disabled={isLoading}
                >
                  <div className={`w-4 h-4 rounded-full ${colorOption.color}`} />
                  <span className="text-sm">{colorOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.slug.trim()}
              className="glass-button"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              💾 {school ? 'Atualizar Escola' : 'Criar Escola'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
