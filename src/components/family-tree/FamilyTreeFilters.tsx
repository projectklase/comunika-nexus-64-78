import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Search, X, Filter } from 'lucide-react';
import { FamilyTreeFilters as Filters } from '@/hooks/useFamilyTreeFilters';

interface FamilyTreeFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  totalFamilies: number;
  filteredCount: number;
}

export function FamilyTreeFilters({
  filters,
  onFiltersChange,
  totalFamilies,
  filteredCount,
}: FamilyTreeFiltersProps) {
  const resetFilters = () => {
    onFiltersChange({
      minStudents: 2,
      maxStudents: null,
      searchTerm: '',
    });
  };

  const hasActiveFilters = 
    filters.minStudents > 2 || 
    filters.maxStudents !== null || 
    filters.searchTerm.length > 0;

  return (
    <Card className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <Label className="font-semibold">Filtros</Label>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {filteredCount} de {totalFamilies}
          </Badge>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Busca por nome */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Buscar Família</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome do responsável ou aluno..."
            value={filters.searchTerm}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Slider de número de alunos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Número de Alunos</Label>
          <span className="text-xs font-semibold text-foreground">
            {filters.minStudents}+ alunos
          </span>
        </div>
        <Slider
          value={[filters.minStudents]}
          onValueChange={(value) => onFiltersChange({ ...filters, minStudents: value[0] })}
          min={2}
          max={10}
          step={1}
          className="w-full"
        />
      </div>
    </Card>
  );
}
