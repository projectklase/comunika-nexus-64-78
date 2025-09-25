import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsStore } from '@/stores/rewards-store';
import { Coins, Users, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationStore } from '@/stores/notification-store';
import { generateRewardsHistoryLink } from '@/utils/deep-links';

interface BonusEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  koinAmount: number;
  studentIds: string[];
}

// Mock students data - in a real app, this would come from a students store
const mockStudents = [
  { id: '1', name: 'Ana Silva', class: 'Turma A' },
  { id: '2', name: 'João Santos', class: 'Turma A' },
  { id: '3', name: 'Maria Costa', class: 'Turma B' },
  { id: '4', name: 'Pedro Oliveira', class: 'Turma B' },
  { id: '5', name: 'Julia Ferreira', class: 'Turma C' },
  { id: '6', name: 'Carlos Lima', class: 'Turma C' },
];

export function BonusEventModal({ isOpen, onClose }: BonusEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createBonusEvent } = useRewardsStore();
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(mockStudents.map(s => s.id));
    }
    setSelectAll(!selectAll);
  };

  const onSubmit = (data: Omit<FormData, 'studentIds'>) => {
    if (!user) return;
    
    if (selectedStudents.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um aluno para receber a bonificação.",
        variant: "destructive"
      });
      return;
    }

    createBonusEvent({
      ...data,
      koinAmount: Number(data.koinAmount), // Force number conversion
      studentIds: selectedStudents,
      createdBy: user.id
    });

    // Evento 2: Aluno ganha Koins por bonificação da secretaria
    selectedStudents.forEach(studentId => {
      notificationStore.add({
        type: 'POST_NEW',
        title: 'Bonificação recebida!',
        message: `Você recebeu uma bonificação de ${data.koinAmount} Koins referente ao evento '${data.name}'!`,
        roleTarget: 'ALUNO',
        link: generateRewardsHistoryLink(),
        meta: {
          koinAmount: Number(data.koinAmount),
          eventName: data.name,
          eventDescription: data.description,
          studentId,
          bonusType: 'event'
        }
      });
    });

    toast({
      title: "Bonificação criada!",
      description: `${selectedStudents.length} aluno(s) receberam ${data.koinAmount} Koins.`,
      duration: 4000
    });

    // Reset form
    reset();
    setSelectedStudents([]);
    setSelectAll(false);
    onClose();
  };

  const handleClose = () => {
    reset();
    setSelectedStudents([]);
    setSelectAll(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-500" />
            Criar Bonificação por Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Event Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Evento *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Nome do evento é obrigatório' })}
                placeholder="Ex: Olimpíada de Matemática 2025"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descreva o evento ou motivo da bonificação..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="koinAmount">Koins por Aluno *</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-500" />
                <Input
                  id="koinAmount"
                  type="number"
                  min="1"
                  {...register('koinAmount', { 
                    required: 'Quantidade de Koins é obrigatória',
                    min: { value: 1, message: 'Deve ser pelo menos 1 Koin' },
                    valueAsNumber: true
                  })}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
              {errors.koinAmount && (
                <p className="text-sm text-destructive">{errors.koinAmount.message}</p>
              )}
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Selecionar Alunos *
              </Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="selectAll" className="text-sm">
                  Selecionar todos
                </Label>
              </div>
            </div>

            <div className="border border-border/50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="space-y-3">
                {mockStudents.map((student) => (
                  <div key={student.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={student.id}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <Label htmlFor={student.id} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{student.name}</span>
                        <span className="text-sm text-muted-foreground">{student.class}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {selectedStudents.length > 0 && (
              <div className="bg-muted/10 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedStudents.length}</strong> aluno(s) selecionado(s) receberão os Koins
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Bonificação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}