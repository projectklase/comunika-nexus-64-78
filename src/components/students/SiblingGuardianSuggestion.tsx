import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Users, Phone, Mail, AlertTriangle, CheckCircle, X, AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Guardian } from '@/hooks/useDuplicateCheck';

interface ExistingStudent {
  id: string;
  name: string;
  email: string;
  guardians?: Guardian[];
}

interface SiblingGuardianSuggestionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similarStudents: ExistingStudent[];
  newStudentName: string; // Nome do aluno sendo cadastrado
  onCopyGuardians: (
    guardians: Guardian[], 
    relatedStudentId: string,
    relatedStudentName: string,
    guardianRelationshipType: string, // Tipo de parentesco com o responsável
    customLabel?: string
  ) => void;
}

// Opções de parentesco RESPONSÁVEL → ALUNO (não mais aluno ↔ aluno)
const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { value: 'MAE', label: '👩 Mãe', description: 'Mãe biológica ou adotiva' },
  { value: 'PAI', label: '👨 Pai', description: 'Pai biológico ou adotivo' },
  { value: 'TIA', label: '👩‍👦 Tia', description: 'Irmã dos pais' },
  { value: 'TIO', label: '👨‍👦 Tio', description: 'Irmão dos pais' },
  { value: 'AVO_F', label: '👵 Avó', description: 'Mãe dos pais' },
  { value: 'AVO', label: '👴 Avô', description: 'Pai dos pais' },
  { value: 'PADRINHO', label: '🕊️ Padrinho', description: 'Padrinho de batismo/crisma' },
  { value: 'MADRINHA', label: '🕊️ Madrinha', description: 'Madrinha de batismo/crisma' },
  { value: 'OUTRO', label: '✏️ Outro', description: 'Digite o tipo de parentesco' },
];

export function SiblingGuardianSuggestion({
  open,
  onOpenChange,
  similarStudents,
  newStudentName,
  onCopyGuardians,
}: SiblingGuardianSuggestionProps) {
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const [customRelationship, setCustomRelationship] = useState<string>('');
  const [showRelationshipSelector, setShowRelationshipSelector] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ExistingStudent | null>(null);

  const studentsWithGuardians = similarStudents.filter(s => s.guardians && s.guardians.length > 0);

  if (studentsWithGuardians.length === 0) {
    return null;
  }

  const handleCopyClick = (student: ExistingStudent) => {
    setSelectedStudent(student);
    setShowRelationshipSelector(true);
  };

  const handleCancelRelationship = () => {
    setShowRelationshipSelector(false);
    setSelectedStudent(null);
    setSelectedRelationship('');
    setCustomRelationship('');
  };

  const handleConfirmAndCopy = () => {
    if (!selectedStudent) return;

    if (!selectedRelationship) {
      toast.error('Selecione o grau de parentesco');
      return;
    }

    if (selectedRelationship === 'OUTRO' && !customRelationship.trim()) {
      toast.error('Digite o tipo de parentesco personalizado');
      return;
    }

    // Remove IDs para criar novos registros
    const newGuardians = (selectedStudent.guardians || []).map(g => ({
      ...g,
      id: undefined,
    }));

    onCopyGuardians(
      newGuardians,
      selectedStudent.id,
      selectedStudent.name,
      selectedRelationship,
      selectedRelationship === 'OUTRO' ? customRelationship : undefined
    );
    
    onOpenChange(false);
    handleCancelRelationship();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto backdrop-blur-xl bg-background/95 border border-white/20">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Possível Parente Detectado</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Encontramos aluno(s) com telefone/endereço similar. Deseja copiar os responsáveis?
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {studentsWithGuardians.map((student) => (
            <div
              key={student.id}
              className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-all"
            >
              {/* Header do Aluno */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/50">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Possível Parente
                </Badge>
              </div>

              {/* Lista de Responsáveis */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Responsáveis Cadastrados ({student.guardians?.length || 0}):
                </p>
                {student.guardians?.map((guardian, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border/30"
                  >
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="bg-muted text-xs">
                        {guardian.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{guardian.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {guardian.relation}
                        </Badge>
                        {guardian.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {guardian.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{guardian.phone}</span>
                          </div>
                        )}
                        {guardian.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{guardian.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão de Ação ou Seletor de Parentesco */}
              {(!showRelationshipSelector || selectedStudent?.id !== student.id) ? (
                <Button
                  onClick={() => handleCopyClick(student)}
                  className="w-full mt-3"
                  variant="default"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Responsáveis
                </Button>
              ) : (
                <div className="mt-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-4">
                  {/* Badge contextual mostrando responsável → novo aluno */}
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      <span className="text-primary">{selectedStudent.guardians?.[0]?.name}</span> → <span className="text-primary">{newStudentName}</span>
                    </span>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block text-foreground">
                      Qual o grau de parentesco entre <span className="text-primary">{selectedStudent.guardians?.[0]?.name}</span> e <span className="text-primary">{newStudentName}</span>?
                    </Label>
                    
                    <RadioGroup 
                      value={selectedRelationship} 
                      onValueChange={setSelectedRelationship}
                      className="space-y-2"
                    >
                      {GUARDIAN_RELATIONSHIP_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-start space-x-3 space-y-0">
                          <RadioGroupItem value={option.value} id={`rel-${option.value}`} />
                          <Label
                            htmlFor={`rel-${option.value}`}
                            className="flex flex-col cursor-pointer flex-1"
                          >
                            <span className="font-medium text-sm">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {selectedRelationship === 'OUTRO' && (
                      <Input
                        placeholder="Ex: Tio-avô, Primo da mãe..."
                        value={customRelationship}
                        onChange={(e) => setCustomRelationship(e.target.value)}
                        className="mt-3"
                      />
                    )}
                  </div>

                  {/* Aviso sobre inferência inteligente */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        <strong>💡 Sistema Inteligente:</strong> Com base nessa informação, o sistema vai inferir automaticamente 
                        os relacionamentos entre alunos (irmãos, primos, etc). Escolha com atenção!
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelRelationship}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmAndCopy}
                      disabled={!selectedRelationship || (selectedRelationship === 'OUTRO' && !customRelationship.trim())}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar e Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Aviso de Segurança */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Aviso Importante</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique se os responsáveis sugeridos são realmente os mesmos antes de copiar.
              Você pode editar os dados após a cópia, se necessário.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Preencher Manualmente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
