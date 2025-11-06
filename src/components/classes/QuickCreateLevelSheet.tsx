import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useLevels } from '@/hooks/useLevels';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const levelSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  code: z.string().optional(),
  order: z.coerce.number().optional(),
  description: z.string().optional(),
});

type LevelFormData = z.infer<typeof levelSchema>;

interface QuickCreateLevelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLevelCreated?: (levelId: string) => void;
  initialName?: string;
}

export function QuickCreateLevelSheet({ 
  open, 
  onOpenChange,
  onLevelCreated,
  initialName 
}: QuickCreateLevelSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createLevel, levels } = useLevels();
  const { toast } = useToast();

  const form = useForm<LevelFormData>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      name: '',
      code: '',
      order: undefined,
      description: '',
    },
  });

  // Pré-preencher nome quando initialName mudar
  React.useEffect(() => {
    if (open && initialName) {
      form.setValue('name', initialName);
    }
  }, [open, initialName, form]);

  const onSubmit = async (data: LevelFormData) => {
    setIsLoading(true);
    
    try {
      // Verificar duplicado (case-insensitive) 
      const isDuplicate = levels.some(level => 
        level.name.toLowerCase() === data.name.toLowerCase() &&
        level.is_active
      );

      if (isDuplicate) {
        toast({
          title: "Nível já existe",
          description: "Já existe um nível com este nome.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const newLevel = await createLevel({
        name: data.name.trim(),
        code: data.code?.trim(),
        display_order: data.order,
        description: data.description?.trim(),
        is_active: true,
      });

      toast({
        title: "Nível criado",
        description: `O nível "${newLevel.name}" foi criado com sucesso.`,
      });

      // Notificar o componente pai
      onLevelCreated?.(newLevel.id);
      
      // Fechar sheet e resetar form
      onOpenChange(false);
      form.reset();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o nível. Tente novamente.",
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Criar Nível</SheetTitle>
          <SheetDescription>
            Adicione um novo nível para organizar suas turmas
          </SheetDescription>
        </SheetHeader>

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
                      placeholder="Ex: 6º ano, A1, Sub-13" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome identificador do nível
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
                      placeholder="Ex: 6A, A1, S13"
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
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="Ex: 1, 2, 3..."
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Ordem de exibição (opcional)
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
                      placeholder="Descrição opcional do nível"
                      {...field} 
                    />
                  </FormControl>
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
                Criar Nível
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}