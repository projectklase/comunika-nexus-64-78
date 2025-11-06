import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModalities } from '@/hooks/useModalities';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const modalitySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type ModalityFormData = z.infer<typeof modalitySchema>;

interface QuickCreateModalitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModalityCreated?: (modalityId: string) => void;
  initialName?: string;
}

export function QuickCreateModalitySheet({ 
  open, 
  onOpenChange,
  onModalityCreated,
  initialName 
}: QuickCreateModalitySheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createModality, modalities } = useModalities();
  const { toast } = useToast();

  const form = useForm<ModalityFormData>({
    resolver: zodResolver(modalitySchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  // Pré-preencher nome quando initialName mudar
  React.useEffect(() => {
    if (open && initialName) {
      form.setValue('name', initialName);
    }
  }, [open, initialName, form]);

  const onSubmit = async (data: ModalityFormData) => {
    setIsLoading(true);
    
    try {
      // Verificar duplicado (case-insensitive)
      const isDuplicate = modalities.some(modality => 
        modality.name.toLowerCase() === data.name.toLowerCase() &&
        modality.is_active
      );

      if (isDuplicate) {
        toast({
          title: "Modalidade já existe",
          description: "Já existe uma modalidade com este nome.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verificar código duplicado (se fornecido)
      if (data.code && data.code.trim()) {
        const isDuplicateCode = modalities.some(modality => 
          modality.code?.toLowerCase() === data.code?.toLowerCase() &&
          modality.is_active
        );

        if (isDuplicateCode) {
          toast({
            title: "Código já existe",
            description: "Já existe uma modalidade com este código.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const newModality = await createModality({
        name: data.name.trim(),
        code: data.code?.trim(),
        description: data.description?.trim(),
        is_active: true,
      });

      toast({
        title: "Modalidade criada",
        description: `A modalidade "${newModality.name}" foi criada com sucesso.`,
      });

      // Notificar o componente pai
      onModalityCreated?.(newModality.id);
      
      // Fechar sheet e resetar form
      onOpenChange(false);
      form.reset();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a modalidade. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-background/95 border border-white/10">
        <DialogHeader>
          <DialogTitle>Criar Modalidade</DialogTitle>
          <DialogDescription>
            Adicione uma nova modalidade para organizar suas turmas
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Regular, Intensivo, Extensivo" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome identificador da modalidade
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: REG, INT, EXT"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Código curto para identificação (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Descrição opcional da modalidade"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Ex: "2x por semana", "3x por semana"
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Modalidade
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}