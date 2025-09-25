import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSubjectStore } from '@/stores/subject-store';
import { useProgramStore } from '@/stores/program-store';
import { Subject } from '@/types/curriculum';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  programId: z.string().min(1, 'Programa é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface SubjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
}

export function SubjectFormModal({ open, onOpenChange, subject }: SubjectFormModalProps) {
  const { toast } = useToast();
  const { createSubject, updateSubject, subjects } = useSubjectStore();
  const { getActivePrograms } = useProgramStore();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { programId: '', name: '', code: '', description: '', isActive: true },
  });

  const programs = getActivePrograms();

  useEffect(() => {
    if (subject) {
      form.reset({
        programId: subject.programId,
        name: subject.name,
        code: subject.code || '',
        description: subject.description || '',
        isActive: subject.isActive,
      });
    } else {
      form.reset({ programId: '', name: '', code: '', description: '', isActive: true });
    }
  }, [subject, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (data.code) {
        const existingCode = subjects.find(s => s.code === data.code && s.id !== subject?.id);
        if (existingCode) {
          toast({ title: "Erro", description: "Já existe uma matéria com este código.", variant: "destructive" });
          return;
        }
      }

      const subjectData = {
        programId: data.programId,
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        isActive: data.isActive,
      };

      if (subject) {
        await updateSubject(subject.id, subjectData);
        toast({ title: "Matéria atualizada", description: "A matéria foi atualizada com sucesso." });
      } else {
        await createSubject(subjectData);
        toast({ title: "Matéria criada", description: "A matéria foi criada com sucesso." });
      }

      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar a matéria.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader><DialogTitle className="gradient-text">{subject ? 'Editar Matéria' : 'Nova Matéria'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="programId" render={({ field }) => (
              <FormItem>
                <FormLabel>Programa *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="glass-input"><SelectValue placeholder="Selecione o programa" /></SelectTrigger></FormControl>
                  <SelectContent className="glass-card">
                    {programs.map(program => <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome da Matéria *</FormLabel><FormControl><Input placeholder="Ex: Gramática" className="glass-input" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Código</FormLabel><FormControl><Input placeholder="Ex: GRAM" className="glass-input" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descrição da matéria..." className="glass-input" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value.toString()}>
                  <FormControl><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="glass-card"><SelectItem value="true">Ativo</SelectItem><SelectItem value="false">Inativo</SelectItem></SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="glass-button">Cancelar</Button>
              <Button type="submit" className="glass-button">{subject ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}