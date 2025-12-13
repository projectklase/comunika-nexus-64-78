import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CreditCard, Loader2 } from 'lucide-react';

interface AddSchoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (schoolData: { name: string; slug: string }) => void;
  isLoading?: boolean;
  priceFormatted: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export function AddSchoolModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  priceFormatted,
}: AddSchoolModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugEdited]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setSlugEdited(false);
    }
  }, [open]);

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
    setSlugEdited(true);
  };

  const handleConfirm = () => {
    if (!name.trim() || !slug.trim()) return;
    onConfirm({ name: name.trim(), slug: slug.trim() });
  };

  const isValid = name.trim().length >= 3 && slug.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Nova Escola</DialogTitle>
          </div>
          <DialogDescription>
            Preencha os dados da nova unidade antes de prosseguir para o pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">Nome da Escola *</Label>
            <Input
              id="school-name"
              placeholder="Ex: Colégio São João - Unidade Centro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-slug">Identificador (slug) *</Label>
            <Input
              id="school-slug"
              placeholder="Ex: colegio-sao-joao-centro"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Usado na URL de acesso. Apenas letras minúsculas, números e hífens.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-accent/30 border border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Custo adicional mensal:</span>
              <span className="text-lg font-bold text-primary">{priceFormatted}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Continuar para Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
