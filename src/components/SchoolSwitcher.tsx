import { useSchool } from '@/contexts/SchoolContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export function SchoolSwitcher() {
  const { currentSchool, availableSchools, switchSchool, isLoading } = useSchool();

  // Só mostrar se usuário tiver 2+ escolas
  if (isLoading || availableSchools.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentSchool?.id || ''}
        onValueChange={switchSchool}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] glass-input">
          <SelectValue placeholder="Selecione a escola" />
        </SelectTrigger>
        <SelectContent className="glass-card">
          {availableSchools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
