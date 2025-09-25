import { useState } from 'react';
import { TeacherActivityDefaults, TeacherPrefsService } from '@/services/teacher-prefs';
import { ActivityType, DeliveryFormat, ProofType } from '@/types/post';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';

interface TeacherPreferencesModalProps {
  userId: string;
  onSave: (prefs: TeacherActivityDefaults) => void;
}

const deliveryFormatOptions = [
  { value: 'PDF', label: 'PDF' },
  { value: 'LINK', label: 'Link' },
  { value: 'APRESENTACAO', label: 'Apresentação' },
  { value: 'IMPRESSO', label: 'Impresso' }
];

const proofTypeOptions = [
  { value: 'OBJETIVA', label: 'Objetiva' },
  { value: 'DISCURSIVA', label: 'Discursiva' },
  { value: 'MISTA', label: 'Mista' }
];

const durationPresets = [30, 50, 60, 90];

export function TeacherPreferencesModal({ userId, onSave }: TeacherPreferencesModalProps) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<TeacherActivityDefaults>(() => 
    TeacherPrefsService.getDefaults(userId)
  );
  const { toast } = useToast();
  const weightsEnabled = useWeightsEnabled();

  const handleSave = () => {
    try {
      TeacherPrefsService.saveDefaults(userId, prefs);
      onSave(prefs);
      setOpen(false);
      toast({
        title: 'Preferências salvas',
        description: 'Suas configurações padrão foram atualizadas.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar preferências.',
        variant: 'destructive'
      });
    }
  };

  const updateWeight = (type: ActivityType, weight: number) => {
    setPrefs(prev => ({
      ...prev,
      defaultWeights: { ...prev.defaultWeights, [type]: weight }
    }));
  };

  const toggleFormat = (format: string) => {
    setPrefs(prev => {
      const hasFormat = prev.defaultFormats.includes(format);
      return {
        ...prev,
        defaultFormats: hasFormat 
          ? prev.defaultFormats.filter(f => f !== format)
          : [...prev.defaultFormats, format]
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Preferências
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de Atividades</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Tipo Padrão */}
          <div className="space-y-2">
            <Label>Tipo Padrão</Label>
            <Select 
              value={prefs.defaultType} 
              onValueChange={(value) => setPrefs(prev => ({ ...prev, defaultType: value as ActivityType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVIDADE">Atividade</SelectItem>
                <SelectItem value="TRABALHO">Trabalho</SelectItem>
                <SelectItem value="PROVA">Prova</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configuração de Peso */}
          <div className="space-y-4">
            <Label>Configuração de Peso</Label>
            
            {/* Toggle para usar peso por padrão */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="default-use-peso" className="text-sm font-medium">
                  Usar peso por padrão
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ativar o toggle de peso automaticamente ao criar atividades
                </p>
              </div>
              <Switch
                id="default-use-peso"
                checked={prefs.defaultUsePeso}
                onCheckedChange={(checked) => setPrefs(prev => ({ ...prev, defaultUsePeso: checked }))}
                disabled={!weightsEnabled}
              />
            </div>

            {/* Pesos Padrão - só habilitado se weightsEnabled e defaultUsePeso */}
            <div className="space-y-3">
              <Label className={!weightsEnabled || !prefs.defaultUsePeso ? 'text-muted-foreground' : ''}>
                Pesos Padrão
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="peso-atividade" className="text-sm">Atividade</Label>
                  <Input
                    id="peso-atividade"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={prefs.defaultWeights.ATIVIDADE || ''}
                    onChange={(e) => updateWeight('ATIVIDADE', parseFloat(e.target.value) || 1)}
                    disabled={!weightsEnabled || !prefs.defaultUsePeso}
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="peso-trabalho" className="text-sm">Trabalho</Label>
                  <Input
                    id="peso-trabalho"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={prefs.defaultWeights.TRABALHO || ''}
                    onChange={(e) => updateWeight('TRABALHO', parseFloat(e.target.value) || 2)}
                    disabled={!weightsEnabled || !prefs.defaultUsePeso}
                    placeholder="2.0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="peso-prova" className="text-sm">Prova</Label>
                  <Input
                    id="peso-prova"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={prefs.defaultWeights.PROVA || ''}
                    onChange={(e) => updateWeight('PROVA', parseFloat(e.target.value) || 3)}
                    disabled={!weightsEnabled || !prefs.defaultUsePeso}
                    placeholder="3.0"
                  />
                </div>
              </div>
              
              {!weightsEnabled && (
                <p className="text-xs text-muted-foreground">
                  Pesos estão desabilitados nas configurações da escola
                </p>
              )}
            </div>
          </div>

          {/* Formatos Padrão */}
          <div className="space-y-3">
            <Label>Formatos de Entrega Padrão (Trabalhos)</Label>
            <div className="flex flex-wrap gap-2">
              {deliveryFormatOptions.map(({ value, label }) => {
                const isSelected = prefs.defaultFormats.includes(value);
                return (
                  <Badge
                    key={value}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => toggleFormat(value)}
                  >
                    {label}
                    {isSelected && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Configurações de Prova */}
          <div className="space-y-4">
            <Label>Configurações Padrão - Provas</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duracao-padrao">Duração Padrão (min)</Label>
                <div className="flex gap-1 mb-2">
                  {durationPresets.map((minutes) => (
                    <Button
                      key={minutes}
                      type="button"
                      variant={prefs.defaultDuration === minutes ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPrefs(prev => ({ ...prev, defaultDuration: minutes }))}
                    >
                      {minutes}
                    </Button>
                  ))}
                </div>
                <Input
                  id="duracao-padrao"
                  type="number"
                  min="1"
                  max="300"
                  value={prefs.defaultDuration}
                  onChange={(e) => setPrefs(prev => ({ 
                    ...prev, 
                    defaultDuration: parseInt(e.target.value) || 50 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo-prova-padrao">Tipo Padrão</Label>
                <Select 
                  value={prefs.defaultProofType} 
                  onValueChange={(value) => setPrefs(prev => ({ 
                    ...prev, 
                    defaultProofType: value as ProofType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proofTypeOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="local-padrao">Local Padrão</Label>
              <Input
                id="local-padrao"
                value={prefs.defaultLocation}
                onChange={(e) => setPrefs(prev => ({ ...prev, defaultLocation: e.target.value }))}
                placeholder="Ex: Sala de Aula, Laboratório..."
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Preferências
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}