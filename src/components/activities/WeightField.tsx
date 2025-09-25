import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { Scale } from 'lucide-react';

interface WeightFieldProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  className?: string;
}

export function WeightField({ value, onChange, error, className }: WeightFieldProps) {
  const weightsEnabled = useWeightsEnabled();

  // Se pesos estão desabilitados, não renderizar o campo
  if (!weightsEnabled) {
    return null;
  }

  return (
    <div className={className}>
      <Label htmlFor="peso" className="flex items-center gap-2">
        <Scale className="h-4 w-4" />
        Peso
      </Label>
      <Input
        id="peso"
        name="peso"
        type="number"
        min="0"
        step="0.1"
        value={value || ''}
        onChange={(e) => {
          const newValue = e.target.value;
          onChange(newValue ? parseFloat(newValue) : null);
        }}
        placeholder="Ex: 1.5"
        className={error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}