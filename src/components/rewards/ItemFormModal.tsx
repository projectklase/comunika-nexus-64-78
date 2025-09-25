import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RewardItem } from '@/types/rewards';
import { useForm } from 'react-hook-form';
import { Coins, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ItemFormModalProps {
  item?: RewardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface FormData {
  name: string;
  description: string;
  koinPrice: number;
  stock: number;
  category?: string;
  images: string[];
}

export function ItemFormModal({ item, isOpen, onClose, onSubmit }: ItemFormModalProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormData>({
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      koinPrice: item?.koinPrice || 0,
      stock: item?.stock || 0,
      category: item?.category || '',
      images: item?.images || ['/placeholder.svg']
    }
  });

  const images = watch('images');
  const isEditing = !!item;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simple validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // In a real implementation, you would upload to a storage service
      // For now, we'll use a placeholder URL
      const imageUrl = `/placeholder.svg?t=${Date.now()}`;
      
      // Add the new image to the array (max 5 images)
      const currentImages = images.filter(img => img !== '/placeholder.svg');
      if (currentImages.length < 5) {
        setValue('images', [...currentImages, imageUrl]);
        toast({
          title: "Sucesso",
          description: "Imagem adicionada com sucesso!"
        });
      } else {
        toast({
          title: "Limite atingido",
          description: "Máximo de 5 imagens por item.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da imagem.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // Always keep at least one placeholder if no images
    setValue('images', newImages.length > 0 ? newImages : ['/placeholder.svg']);
  };

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      isActive: true
    });
    
    toast({
      title: isEditing ? "Item atualizado!" : "Item criado!",
      description: isEditing 
        ? "O item foi atualizado com sucesso." 
        : "O novo item foi adicionado à loja.",
      duration: 3000
    });
    
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Item' : 'Novo Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Images Section */}
          <div className="space-y-3">
            <Label>Imagens do Item</Label>
            
            {/* Image Preview Grid */}
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={image}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  {images.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Button */}
            {images.length < 5 && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading}
                />
                <Label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Enviando...' : 'Adicionar Imagem'}
                </Label>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Item *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Nome é obrigatório' })}
                placeholder="Ex: Fone de Ouvido Bluetooth"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="Ex: Eletrônicos"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              {...register('description', { required: 'Descrição é obrigatória' })}
              placeholder="Descreva o item detalhadamente..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="koinPrice">Preço em Koins *</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-500" />
                <Input
                  id="koinPrice"
                  type="number"
                  min="1"
                  {...register('koinPrice', { 
                    required: 'Preço é obrigatório',
                    min: { value: 1, message: 'Preço deve ser maior que 0' }
                  })}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
              {errors.koinPrice && (
                <p className="text-sm text-destructive">{errors.koinPrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Estoque Inicial *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                {...register('stock', { 
                  required: 'Estoque é obrigatório',
                  min: { value: 0, message: 'Estoque não pode ser negativo' }
                })}
                placeholder="0"
              />
              {errors.stock && (
                <p className="text-sm text-destructive">{errors.stock.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Atualizar Item' : 'Criar Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
