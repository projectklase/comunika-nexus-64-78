import { ActivityType, ActivityMeta, ProofType } from '@/types/post';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { WeightToggleField } from '@/components/activities/WeightToggleField';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityFieldsProps {
  type: ActivityType;
  meta: ActivityMeta & { usePeso?: boolean; allow_attachments?: boolean };
  onChange: (meta: ActivityMeta & { usePeso?: boolean; allow_attachments?: boolean }) => void;
}

const proofTypeOptions = [
  { value: 'OBJETIVA', label: 'Objetiva' },
  { value: 'DISCURSIVA', label: 'Discursiva' },
  { value: 'MISTA', label: 'Mista' }
];

const durationPresets = [30, 50, 60, 90];

export function ActivityFields({ type, meta, onChange }: ActivityFieldsProps) {
  const { getKoinsEnabled } = useSchoolSettings();
  const koinsEnabled = getKoinsEnabled();
  const requiresDelivery = meta.requiresDelivery !== false;

  const updateMeta = (updates: Partial<ActivityMeta & { usePeso?: boolean }>) => {
    onChange({ ...meta, ...updates });
  };

  const handleWeightChange = (peso: number | null, usePeso: boolean) => {
    updateMeta({ peso, usePeso });
  };

  const handleRequiresDeliveryChange = (checked: boolean) => {
    if (!checked) {
      // Limpar recompensas quando não requer entrega
      updateMeta({ 
        requiresDelivery: checked,
        koinReward: undefined,
        xpReward: undefined
      });
    } else {
      updateMeta({ requiresDelivery: checked });
    }
  };

  // Componente reutilizável para campo de XP (10-500 XP)
  const XpRewardField = () => {
    const xpValue = meta.xpReward || 0;
    const isOverLimit = xpValue > 500;
    
    return (
      <div className="space-y-2">
        <Label htmlFor="xp-reward">Recompensa em XP</Label>
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="xp-reward"
            type="number"
            min="10"
            max="500"
            value={meta.xpReward || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              updateMeta({ xpReward: Math.min(500, Math.max(0, value)) || undefined });
            }}
            placeholder="10"
            className={cn("pl-10", isOverLimit && "border-destructive")}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          XP que o aluno receberá ao concluir (10-500)
        </p>
        {isOverLimit && (
          <p className="text-xs text-destructive">
            ⚠️ O valor máximo permitido é 500 XP
          </p>
        )}
      </div>
    );
  };

  if (type === 'ATIVIDADE') {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <Switch
            id="requires-delivery"
            checked={requiresDelivery}
            onCheckedChange={handleRequiresDeliveryChange}
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

        {requiresDelivery && koinsEnabled && (
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

        {requiresDelivery && <XpRewardField />}
        
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
            checked={requiresDelivery}
            onCheckedChange={handleRequiresDeliveryChange}
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

        {requiresDelivery && koinsEnabled && (
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

        {requiresDelivery && <XpRewardField />}
      </div>
    );
  }

  if (type === 'PROVA') {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <Switch
            id="requires-delivery"
            checked={requiresDelivery}
            onCheckedChange={handleRequiresDeliveryChange}
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

        {requiresDelivery && koinsEnabled && (
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

        {requiresDelivery && <XpRewardField />}

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
      </div>
    );
  }

  return null;
}