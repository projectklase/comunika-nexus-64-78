import { ActivityType, ActivityMeta, DeliveryFormat, ProofType } from '@/types/post';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WeightToggleField } from '@/components/activities/WeightToggleField';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { X, Coins, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface ActivityFieldsProps {
  type: ActivityType;
  meta: ActivityMeta & { usePeso?: boolean; allow_attachments?: boolean };
  onChange: (meta: ActivityMeta & { usePeso?: boolean; allow_attachments?: boolean }) => void;
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

export function ActivityFields({ type, meta, onChange }: ActivityFieldsProps) {
  const [customFormat, setCustomFormat] = useState('');
  const { getKoinsEnabled } = useSchoolSettings();
  const koinsEnabled = getKoinsEnabled();

  const updateMeta = (updates: Partial<ActivityMeta & { usePeso?: boolean }>) => {
    onChange({ ...meta, ...updates });
  };

  const handleWeightChange = (peso: number | null, usePeso: boolean) => {
    updateMeta({ peso, usePeso });
  };

  const addCustomFormat = () => {
    if (customFormat.trim()) {
      const currentFormats = meta.formatosEntrega || [];
      const newFormats = [...currentFormats, 'OUTRO' as DeliveryFormat];
      updateMeta({ 
        formatosEntrega: newFormats,
        formatoCustom: customFormat.trim()
      });
      setCustomFormat('');
    }
  };

  const removeFormat = (format: DeliveryFormat) => {
    const currentFormats = meta.formatosEntrega || [];
    updateMeta({ 
      formatosEntrega: currentFormats.filter(f => f !== format),
      ...(format === 'OUTRO' ? { formatoCustom: undefined } : {})
    });
  };

  const toggleFormat = (format: DeliveryFormat) => {
    const currentFormats = meta.formatosEntrega || [];
    const hasFormat = currentFormats.includes(format);
    
    if (hasFormat) {
      removeFormat(format);
    } else {
      updateMeta({ formatosEntrega: [...currentFormats, format] });
    }
  };

  // Componente reutilizável para campo de XP
  const XpRewardField = () => (
    <div className="space-y-2">
      <Label htmlFor="xp-reward">Recompensa em XP</Label>
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="xp-reward"
          type="number"
          min="0"
          max="10"
          value={meta.xpReward || ''}
          onChange={(e) => updateMeta({ xpReward: Math.min(10, parseInt(e.target.value) || 0) || undefined })}
          placeholder="0"
          className="pl-10"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        XP que o aluno receberá ao concluir (máx. 10)
      </p>
    </div>
  );

  if (type === 'ATIVIDADE') {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <Switch
            id="requires-delivery"
            checked={meta.requiresDelivery !== false}
            onCheckedChange={(checked) => updateMeta({ requiresDelivery: checked })}
          />
          <Label htmlFor="requires-delivery" className="cursor-pointer">
            Esta atividade requer entrega pelo aluno
          </Label>
        </div>

        <WeightToggleField
          value={meta.peso}
          usePeso={meta.usePeso}
          activityType={type}
          onChange={handleWeightChange}
        />

        {koinsEnabled && (
          <div className="space-y-2">
            <Label htmlFor="koin-reward">Recompensa em Koins</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="koin-reward"
                type="number"
                min="0"
                max="100"
                value={meta.koinReward || ''}
                onChange={(e) => updateMeta({ koinReward: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="0"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Koins que o aluno receberá ao concluir esta atividade
            </p>
          </div>
        )}

        <XpRewardField />
        
        <div className="space-y-2">
          <Label htmlFor="rubrica">Rubrica de Avaliação</Label>
          <Textarea
            id="rubrica"
            value={meta.rubrica || ''}
            onChange={(e) => updateMeta({ rubrica: e.target.value })}
            placeholder="Descreva os critérios de avaliação..."
            rows={4}
          />
        </div>
      </div>
    );
  }

  if (type === 'TRABALHO') {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <Switch
            id="requires-delivery"
            checked={meta.requiresDelivery !== false}
            onCheckedChange={(checked) => updateMeta({ requiresDelivery: checked })}
          />
          <Label htmlFor="requires-delivery" className="cursor-pointer">
            Este trabalho requer entrega pelo aluno
          </Label>
        </div>

        <WeightToggleField
          value={meta.peso}
          usePeso={meta.usePeso}
          activityType={type}
          onChange={handleWeightChange}
        />

        {koinsEnabled && (
          <div className="space-y-2">
            <Label htmlFor="koin-reward">Recompensa em Koins</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="koin-reward"
                type="number"
                min="0"
                max="100"
                value={meta.koinReward || ''}
                onChange={(e) => updateMeta({ koinReward: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="0"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Koins que o aluno receberá ao concluir este trabalho
            </p>
          </div>
        )}

        <XpRewardField />

        <div className="space-y-3">
          <Label>Formatos de Entrega</Label>
          <div className="flex flex-wrap gap-2">
            {deliveryFormatOptions.map(({ value, label }) => {
              const isSelected = meta.formatosEntrega?.includes(value as DeliveryFormat);
              return (
                <Badge
                  key={value}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => toggleFormat(value as DeliveryFormat)}
                >
                  {label}
                  {isSelected && <X className="ml-1 h-3 w-3" />}
                </Badge>
              );
            })}
            
            {meta.formatosEntrega?.includes('OUTRO') && (
              <Badge variant="default" className="cursor-pointer">
                {meta.formatoCustom}
                <X 
                  className="ml-1 h-3 w-3" 
                  onClick={() => removeFormat('OUTRO')}
                />
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={customFormat}
              onChange={(e) => setCustomFormat(e.target.value)}
              placeholder="Formato personalizado..."
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={addCustomFormat}
              disabled={!customFormat.trim()}
            >
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="permitir-grupo"
            checked={meta.permitirGrupo || false}
            onCheckedChange={(checked) => updateMeta({ permitirGrupo: checked })}
          />
          <Label htmlFor="permitir-grupo">Permitir entrega em grupo</Label>
        </div>
      </div>
    );
  }

  if (type === 'PROVA') {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <Switch
            id="requires-delivery"
            checked={meta.requiresDelivery !== false}
            onCheckedChange={(checked) => updateMeta({ requiresDelivery: checked })}
          />
          <Label htmlFor="requires-delivery" className="cursor-pointer">
            Esta prova requer entrega pelo aluno
          </Label>
        </div>

        <WeightToggleField
          value={meta.peso}
          usePeso={meta.usePeso}
          activityType={type}
          onChange={handleWeightChange}
        />

        {koinsEnabled && (
          <div className="space-y-2">
            <Label htmlFor="koin-reward">Recompensa em Koins</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="koin-reward"
                type="number"
                min="0"
                max="100"
                value={meta.koinReward || ''}
                onChange={(e) => updateMeta({ koinReward: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="0"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Koins que o aluno receberá ao concluir esta prova
            </p>
          </div>
        )}

        <XpRewardField />

        <div className="space-y-2">
          <Label>Duração (minutos)</Label>
          <div className="flex gap-2 mb-2">
            {durationPresets.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                variant={meta.duracao === minutes ? "default" : "outline"}
                size="sm"
                onClick={() => updateMeta({ duracao: minutes })}
              >
                {minutes}min
              </Button>
            ))}
          </div>
          <Input
            type="number"
            min="1"
            max="300"
            value={meta.duracao || 50}
            onChange={(e) => updateMeta({ duracao: parseInt(e.target.value) || 50 })}
            placeholder="50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="local">Local da Prova</Label>
          <Input
            id="local"
            value={meta.local || ''}
            onChange={(e) => updateMeta({ local: e.target.value })}
            placeholder="Ex: Laboratório de Informática"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo-prova">Tipo de Prova</Label>
          <Select 
            value={meta.tipoProva || 'DISCURSIVA'} 
            onValueChange={(value) => updateMeta({ tipoProva: value as ProofType })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
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

        <div className="flex items-center space-x-2">
          <Switch
            id="bloquear-anexos"
            checked={meta.bloquearAnexosAluno || false}
            onCheckedChange={(checked) => updateMeta({ bloquearAnexosAluno: checked })}
          />
          <Label htmlFor="bloquear-anexos">Bloquear anexos do aluno</Label>
        </div>
      </div>
    );
  }

  return null;
}