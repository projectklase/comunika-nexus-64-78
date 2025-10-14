import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Users, Gift, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addNotification } from "@/stores/notification-store";
import { generateRewardsHistoryLink } from "@/utils/deep-links";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";

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

export function BonusEventModal({ isOpen, onClose }: BonusEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { students, loading: loadingStudents } = useStudents();
  const { classes, loading: loadingClasses } = useClasses();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filterClassId, setFilterClassId] = useState<string>("all");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>();

  // Filter students by class
  const filteredStudents = useMemo(() => {
    if (filterClassId === "all") {
      return students;
    }
    return students.filter((student) => student.classes?.some((cls) => cls.id === filterClassId));
  }, [students, filterClassId]);

  // Update selectAll state when filtered students change
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const allFilteredSelected = filteredStudents.every((s) => selectedStudents.includes(s.id));
      setSelectAll(allFilteredSelected);
    } else {
      setSelectAll(false);
    }
  }, [filteredStudents, selectedStudents]);

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect only filtered students
      setSelectedStudents((prev) => prev.filter((id) => !filteredStudents.some((s) => s.id === id)));
    } else {
      // Select all filtered students
      setSelectedStudents((prev) => {
        const newIds = filteredStudents.map((s) => s.id);
        return [...new Set([...prev, ...newIds])];
      });
    }
  };

  const onSubmit = async (data: Omit<FormData, "studentIds">) => {
    if (!user) return;

    if (selectedStudents.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "Selecione pelo menos um aluno para receber a bonificação.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Ligar para o "gerente" seguro (a Edge Function) para dar os Koins
      const { error: bonusError } = await supabase.functions.invoke("grant-koin-bonus", {
        body: {
          eventName: data.name,
          eventDescription: data.description,
          koinAmount: Number(data.koinAmount),
          studentIds: selectedStudents,
          grantedBy: user.id, // Passa o ID do admin que está concedendo
        },
      });

      if (bonusError) {
        throw new Error(bonusError.message || "A função de servidor para bônus falhou.");
      }

      // 2. Enviar um "aviso" (notificação) para os alunos usando a nova função
      await Promise.all(
        selectedStudents.map((studentId) =>
          addNotification({
            user_id: studentId,
            type: "KOIN_BONUS",
            title: "Bonificação Recebida!",
            message: `Você recebeu ${data.koinAmount} Koins pelo evento '${data.name}'!`,
            role_target: "ALUNO",
            link: generateRewardsHistoryLink(),
            meta: { koinAmount: Number(data.koinAmount), eventName: data.name },
          }),
        ),
      );

      toast({
        title: "Bonificação Criada com Sucesso!",
        description: `${selectedStudents.length} aluno(s) receberam ${data.koinAmount} Koins.`,
      });

      // 3. Limpar e fechar o modal
      reset();
      setSelectedStudents([]);
      onClose();
    } catch (error: any) {
      console.error("Erro ao criar bonificação:", error);
      toast({
        title: "Erro ao criar bonificação",
        // Mostra o erro real vindo do Supabase/Edge Function
        description: error.message || "Ocorreu um erro. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    setSelectedStudents([]);
    setSelectAll(false);
    setFilterClassId("all");
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
                {...register("name", { required: "Nome do evento é obrigatório" })}
                placeholder="Ex: Olimpíada de Matemática 2025"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register("description")}
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
                  {...register("koinAmount", {
                    required: "Quantidade de Koins é obrigatória",
                    min: { value: 1, message: "Deve ser pelo menos 1 Koin" },
                    valueAsNumber: true,
                  })}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
              {errors.koinAmount && <p className="text-sm text-destructive">{errors.koinAmount.message}</p>}
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
                  disabled={loadingStudents || filteredStudents.length === 0}
                />
                <Label htmlFor="selectAll" className="text-sm">
                  Selecionar todos {filterClassId !== "all" && "(filtrados)"}
                </Label>
              </div>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterClassId} onValueChange={setFilterClassId} disabled={loadingClasses}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classes
                    .filter((cls) => cls.status === "ATIVA")
                    .map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border/50 rounded-lg p-4 max-h-60 overflow-y-auto">
              {loadingStudents ? (
                <div className="text-center py-4 text-sm text-muted-foreground">Carregando alunos...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {filterClassId === "all" ? "Nenhum aluno cadastrado" : "Nenhum aluno encontrado nesta turma"}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map((student) => {
                    const studentClasses = student.classes?.map((c) => c.name).join(", ") || "Sem turma";
                    return (
                      <div key={student.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={student.id}
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                        />
                        <Label htmlFor={student.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-sm text-muted-foreground">{studentClasses}</span>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
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
            <Button type="submit">Criar Bonificação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
