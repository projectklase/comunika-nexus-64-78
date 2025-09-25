import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { Scale } from 'lucide-react';
import { ActivityType } from '@/types/post';

interface WeightToggleFieldProps {
  value?: number | null;
  usePeso?: boolean;
  activityType: ActivityType;
  onChange: (value: number | null, usePeso: boolean) => void;
  error?: string;
  className?: string;
}

const DEFAULT_WEIGHTS = {
  ATIVIDADE: 1,
  TRABALHO: 2,
  PROVA: 3
} as const;

export function WeightToggleField({ 
  value, 
  usePeso = true, 
  activityType,
  onChange, 
  error, 
  className 
}: WeightToggleFieldProps) {
  const weightsEnabled = useWeightsEnabled();

  // Se pesos estão desabilitados na escola, não renderizar
  if (!weightsEnabled) {
    return null;
  }

  const handleToggleChange = (enabled: boolean) => {
    if (enabled) {
      // Ao habilitar, usar peso padrão ou valor atual
      const defaultWeight = value || DEFAULT_WEIGHTS[activityType];
      onChange(defaultWeight, true);
    } else {
      // Ao desabilitar, manter valor mas marcar como não usar
      onChange(null, false);
    }
  };

  const handleWeightChange = (newValue: number | null) => {
    onChange(newValue, usePeso);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Toggle para usar peso */}
        <div className="flex items-center justify-between">
          <Label htmlFor="use-weight" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Usar peso nesta atividade
          </Label>
          <Switch
            id="use-weight"
            checked={usePeso}
            onCheckedChange={handleToggleChange}
          />
        </div>

        {/* Campo de peso - só aparece se toggle estiver ligado */}
        {usePeso && (
          <div className="space-y-2">
            <Label htmlFor="peso">Peso (0 - 10)</Label>
            <Input
              id="peso"
              name="peso"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={value || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                handleWeightChange(newValue ? parseFloat(newValue) : null);
              }}
              placeholder={`Ex: ${DEFAULT_WEIGHTS[activityType]}`}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}