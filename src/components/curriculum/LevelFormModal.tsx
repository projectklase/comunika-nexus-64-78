import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLevelStore } from '@/stores/level-store';
import { useProgramStore } from '@/stores/program-store';
import { Level } from '@/types/curriculum';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  programId: z.string().min(1, 'Programa é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  order: z.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface LevelFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level?: Level | null;
}

export function LevelFormModal({ open, onOpenChange, level }: LevelFormModalProps) {
  const { toast } = useToast();
  const { createLevel, updateLevel } = useLevelStore();
  const { getActivePrograms } = useProgramStore();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      programId: '',
      name: '',
      order: undefined,
      description: '',
      isActive: true,
    },
  });

  const programs = getActivePrograms();

  useEffect(() => {
    if (level) {
      form.reset({
        programId: level.programId,
        name: level.name,
        order: level.order,
        description: level.description || '',
        isActive: level.isActive,
      });
    } else {
      form.reset({
        programId: '',
        name: '',
        order: undefined,
        description: '',
        isActive: true,
      });
    }
  }, [level, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const levelData = {
        programId: data.programId,
        name: data.name,
        order: data.order,
        description: data.description || undefined,
        isActive: data.isActive,
      };

      if (level) {
        await updateLevel(level.id, levelData);
        toast({
          title: "Nível atualizado",
          description: "O nível foi atualizado com sucesso.",
        });
      } else {
        await createLevel(levelData);
        toast({
          title: "Nível criado",
          description: "O nível foi criado com sucesso.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o nível.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {level ? 'Editar Nível' : 'Novo Nível'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="programId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Programa *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Selecione o programa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card">
                      {programs.map(program => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Nível *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: A1" 
                        className="glass-input"
                        {...field} 
                      />
                    </FormControl>
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
                        placeholder="1" 
                        className="glass-input"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição do nível..." 
                      className="glass-input"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'true')} 
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card">
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="glass-button"
              >
                Cancelar
              </Button>
              <Button type="submit" className="glass-button">
                {level ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}