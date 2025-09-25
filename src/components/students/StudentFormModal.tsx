import { useState, useEffect } from 'react';
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  useUnsavedChangesGuard
} from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePeopleStore } from '@/stores/people-store';
import { Person } from '@/types/class';
import { toast } from 'sonner';

interface StudentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Person | null;
}

export function StudentFormModal({ open, onOpenChange, student }: StudentFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  const { createPerson, updatePerson } = usePeopleStore();

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        email: student.email || '',
        isActive: student.isActive,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        isActive: true,
      });
    }
  }, [student, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      if (student) {
        await updatePerson(student.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          isActive: formData.isActive,
        });
        toast.success('Aluno atualizado com sucesso');
      } else {
        await createPerson({
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          role: 'ALUNO',
          isActive: formData.isActive,
        });
        toast.success('Aluno criado com sucesso');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar aluno');
    } finally {
      setLoading(false);
    }
  };

  const isDirty = formData.name !== (student?.name || '') || 
                  formData.email !== (student?.email || '');
  
  const { requestClose, GuardDialog } = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => {
      if (!formData.name.trim()) {
        toast.error('Nome é obrigatório');
        return;
      }
      setLoading(true);
      try {
        if (student) {
          await updatePerson(student.id, {
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            isActive: formData.isActive,
          });
          toast.success('Aluno atualizado com sucesso');
        } else {
          await createPerson({
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            role: 'ALUNO',
            isActive: formData.isActive,
          });
          toast.success('Aluno criado com sucesso');
        }
        onOpenChange(false);
      } catch (error) {
        toast.error('Erro ao salvar aluno');
      } finally {
        setLoading(false);
      }
    },
    onDiscard: () => onOpenChange(false)
  });

  return (
    <>
      <AppDialog 
        open={open} 
        onOpenChange={(newOpen) => {
          if (!newOpen) {
            requestClose(() => onOpenChange(false));
          } else {
            onOpenChange(true);
          }
        }}
      >
        <AppDialogContent className="glass">
          <AppDialogHeader>
            <AppDialogTitle>
              {student ? 'Editar Aluno' : 'Novo Aluno'}
            </AppDialogTitle>
          </AppDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Digite o email (opcional)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="isActive">Ativo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : student ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </AppDialogContent>
    </AppDialog>
    <GuardDialog />
  </>
  );
}