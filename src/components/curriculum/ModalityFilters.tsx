import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { ModalityFilters } from '@/types/curriculum';
import { useProgramStore } from '@/stores/program-store';

interface ModalityFiltersProps {
  filters: ModalityFilters;
  onFiltersChange: (filters: ModalityFilters) => void;
}

export function ModalityFilters({ filters, onFiltersChange }: ModalityFiltersProps) {
  const { getActivePrograms } = useProgramStore();
  const programs = getActivePrograms();

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleProgramChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      programId: value === 'all' ? undefined : value 
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      isActive: value === 'all' ? undefined : value === 'active' 
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Busca */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Nome ou código..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Programa */}
        <div className="space-y-2">
          <Label>Programa</Label>
          <Select value={filters.programId || 'all'} onValueChange={handleProgramChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os programas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os programas</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select 
            value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'} 
            onValueChange={handleStatusChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}