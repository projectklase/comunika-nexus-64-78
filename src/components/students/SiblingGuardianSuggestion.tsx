import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Users, Phone, Mail, AlertTriangle, CheckCircle, X, Sparkles } from 'lucide-react';
import { Guardian } from '@/hooks/useDuplicateCheck';
import { toast } from 'sonner';

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
  currentStudentGuardians?: Guardian[]; // Guardians do aluno sendo cadastrado
  onCopyGuardians: (
    guardians: Guardian[], 
    relatedStudentId: string,
    relatedStudentName: string,
    relationshipData: {
      type: string;
      customLabel?: string;
    }
  ) => void;
}

interface RelationshipInference {
  type: 'SIBLING' | 'COUSIN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

// Função para inferir relacionamento baseado em responsáveis compartilhados
function inferRelationshipsFromGuardians(
  currentStudentGuardians: Guardian[],
  relatedStudentGuardians: Guardian[]
): RelationshipInference | null {
  if (!currentStudentGuardians.length || !relatedStudentGuardians.length) {
    return null;
  }

  // 1️⃣ Regra: MESMO PAI ou MESMA MÃE → SIBLING (irmãos) - ALTA confiança
  const sharedParent = currentStudentGuardians.find(cg => 
    (cg.relation === 'PAI' || cg.relation === 'MAE') &&
    relatedStudentGuardians.some(rg => {
      // Verifica se é o mesmo tipo de relação (PAI com PAI, MAE com MAE)
      if (rg.relation !== cg.relation) return false;
      
      // Compara por email ou telefone
      const sameEmail = cg.email && rg.email && 
        cg.email.toLowerCase().trim() === rg.email.toLowerCase().trim();
      const samePhone = cg.phone && rg.phone && 
        cg.phone.replace(/\D/g, '') === rg.phone.replace(/\D/g, '');
      
      return sameEmail || samePhone;
    })
  );
  
  if (sharedParent) {
    const parentType = sharedParent.relation === 'PAI' ? 'pai' : 'mãe';
    return {
      type: 'SIBLING',
      confidence: 'HIGH',
      reason: `Compartilham o mesmo ${parentType}: ${sharedParent.name}`
    };
  }
  
  // 2️⃣ Regra: MESMO RESPONSÁVEL/TUTOR → SIBLING (sugestão) - MÉDIA confiança
  const sharedGuardian = currentStudentGuardians.find(cg => 
    (cg.relation === 'RESPONSAVEL' || cg.relation === 'TUTOR') &&
    relatedStudentGuardians.some(rg => {
      const sameEmail = cg.email && rg.email && 
        cg.email.toLowerCase().trim() === rg.email.toLowerCase().trim();
      const samePhone = cg.phone && rg.phone && 
        cg.phone.replace(/\D/g, '') === rg.phone.replace(/\D/g, '');
      
      return sameEmail || samePhone;
    })
  );
  
  if (sharedGuardian) {
    return {
      type: 'SIBLING',
      confidence: 'MEDIUM',
      reason: `Compartilham o mesmo responsável: ${sharedGuardian.name}`
    };
  }
  
  return null;
}

// ✅ FASE 4: Removido GODPARENT_GODCHILD (agora só via guardianRelationships)
const RELATIONSHIP_OPTIONS = [
  { value: 'SIBLING', label: '👨‍👩‍👧‍👦 Irmão/Irmã', description: 'Compartilham os mesmos pais' },
  { value: 'COUSIN', label: '👥 Primo/Prima', description: 'Filhos de irmãos dos pais' },
  { value: 'UNCLE_NEPHEW', label: '👨‍👦 Tio-Sobrinho', description: 'Relação tio/tia com sobrinho' },
  { value: 'OTHER', label: '✏️ Outro', description: 'Digite a relação específica' },
];

// ✨ FASE 3: Opções de relacionamento Guardian → Student
const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { value: 'GODPARENT', label: '🕊️ Padrinho/Madrinha', description: 'Relação de compadrio' },
  { value: 'EXTENDED_FAMILY', label: '👨‍👩‍👧 Família Estendida', description: 'Avós, tios, primos adultos' },
  { value: 'OTHER', label: '✏️ Outro', description: 'Digite a relação específica' },
];

export function SiblingGuardianSuggestion({
  open,
  onOpenChange,
  similarStudents,
  currentStudentGuardians = [],
  onCopyGuardians,
}: SiblingGuardianSuggestionProps) {
  const [selectedRelationship, setSelectedRelationship] = useState<string>('SIBLING');
  const [customRelationship, setCustomRelationship] = useState<string>('');
  const [showRelationshipSelector, setShowRelationshipSelector] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ExistingStudent | null>(null);
  
  // ✨ FASE 3: Estado para relacionamentos Guardian → Student
  const [showGuardianRelationship, setShowGuardianRelationship] = useState(false);
  const [selectedGuardianForRelationship, setSelectedGuardianForRelationship] = useState<Guardian | null>(null);

  const studentsWithGuardians = similarStudents.filter(s => s.guardians && s.guardians.length > 0);

  // Calcular inferência de relacionamento para cada aluno similar
  const studentInferences = useMemo(() => {
    const inferences = new Map<string, RelationshipInference | null>();
    
    studentsWithGuardians.forEach(student => {
      const inference = inferRelationshipsFromGuardians(
        currentStudentGuardians,
        student.guardians || []
      );
      inferences.set(student.id, inference);
    });
    
    return inferences;
  }, [studentsWithGuardians, currentStudentGuardians]);

  // Pré-selecionar SIBLING se houver inferência HIGH para o aluno selecionado
  useEffect(() => {
    if (selectedStudent) {
      const inference = studentInferences.get(selectedStudent.id);
      if (inference && inference.confidence === 'HIGH') {
        setSelectedRelationship(inference.type);
      }
    }
  }, [selectedStudent, studentInferences]);

  if (studentsWithGuardians.length === 0) {
    return null;
  }

  const handleCopyClick = (student: ExistingStudent) => {
    setSelectedStudent(student);
    setShowRelationshipSelector(true);
    
    // Pré-selecionar baseado na inferência
    const inference = studentInferences.get(student.id);
    if (inference) {
      setSelectedRelationship(inference.type);
    }
  };

  const handleCancelRelationship = () => {
    setShowRelationshipSelector(false);
    setSelectedStudent(null);
    setSelectedRelationship('SIBLING');
    setCustomRelationship('');
  };

  const handleConfirmAndCopy = () => {
    if (!selectedStudent) return;

    // ⚠️ FASE 4 VALIDAÇÃO: Prevenir relacionamentos inválidos
    const validTypes = ['SIBLING', 'COUSIN', 'UNCLE_NEPHEW', 'OTHER'];
    if (!validTypes.includes(selectedRelationship)) {
      console.error('❌ FASE 4 VALIDAÇÃO: Tipo de relacionamento inválido:', selectedRelationship);
      toast.error('Tipo de relacionamento inválido entre alunos');
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
      {
        type: selectedRelationship,
        customLabel: selectedRelationship === 'OTHER' ? customRelationship : undefined
      }
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

              {/* Badge de Detecção Automática */}
              {(() => {
                const inference = studentInferences.get(student.id);
                if (inference && inference.confidence === 'HIGH') {
                  return (
                    <Alert className="mb-3 bg-green-500/10 border-green-500/30">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm">
                        <span className="font-semibold text-green-700">Detectado Automaticamente:</span>{' '}
                        <span className="text-green-600">{inference.reason}</span>
                      </AlertDescription>
                    </Alert>
                  );
                } else if (inference && inference.confidence === 'MEDIUM') {
                  return (
                    <Alert className="mb-3 bg-blue-500/10 border-blue-500/30">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm">
                        <span className="font-semibold text-blue-700">Possível Relação:</span>{' '}
                        <span className="text-blue-600">{inference.reason}</span>
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* Lista de Responsáveis */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Responsáveis Cadastrados ({student.guardians?.length || 0}):
                </p>
                {student.guardians?.map((guardian, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border/30 group"
                  >
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="bg-muted text-xs">
                        {guardian.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{guardian.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {guardian.relation}
                        </Badge>
                        {guardian.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Principal
                          </Badge>
                        )}
                        {/* ✨ FASE 3: Botão para registrar relacionamento Guardian → Student */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setSelectedGuardianForRelationship(guardian);
                            setShowGuardianRelationship(true);
                          }}
                        >
                          <Users className="w-3 h-3 mr-1" />
                          É padrinho/madrinha?
                        </Button>
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
                <div className="mt-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <Label className="text-sm font-semibold mb-2 block">
                    Qual a relação entre os alunos?
                  </Label>

                  {/* Mostrar inferência no seletor de relacionamento */}
                  {(() => {
                    const inference = studentInferences.get(selectedStudent.id);
                    if (inference) {
                      return (
                        <div className={`mb-3 p-2 rounded-md flex items-start gap-2 ${
                          inference.confidence === 'HIGH' 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : 'bg-blue-500/10 border border-blue-500/30'
                        }`}>
                          <Sparkles className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            inference.confidence === 'HIGH' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${
                              inference.confidence === 'HIGH' ? 'text-green-700' : 'text-blue-700'
                            }`}>
                              {inference.confidence === 'HIGH' ? '✓ Detectado Automaticamente' : 'Possível Relação'}
                            </p>
                            <p className={`text-xs ${
                              inference.confidence === 'HIGH' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {inference.reason}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <Select
                    value={selectedRelationship}
                    onValueChange={(value) => {
                      setSelectedRelationship(value);
                      if (value !== 'OTHER') setCustomRelationship('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Campo customizado quando escolher "Outro" */}
                  {selectedRelationship === 'OTHER' && (
                    <Input
                      placeholder="Ex: Primo de segundo grau, Vizinho responsável, etc."
                      value={customRelationship}
                      onChange={(e) => setCustomRelationship(e.target.value)}
                      className="mt-2"
                    />
                  )}
                  
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
                      disabled={selectedRelationship === 'OTHER' && !customRelationship.trim()}
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

        {/* ✨ FASE 3: Informação sobre padrinhos/madrinhas */}
        <Alert className="mt-4 bg-blue-500/10 border-blue-500/20">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-blue-700">Dica:</span>{' '}
            <span className="text-blue-600">
              Para registrar padrinhos/madrinhas, passe o mouse sobre o responsável e clique em "É padrinho/madrinha?".
              Isso criará um relacionamento especial entre o responsável e o aluno.
            </span>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Preencher Manualmente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
