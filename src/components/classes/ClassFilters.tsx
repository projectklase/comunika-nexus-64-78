import { useState, useEffect } from 'react';
import { ClassFilters as ClassFiltersType } from '@/types/class';
import { usePeopleStore } from '@/stores/people-store';
import { useGlobalLevelStore } from '@/stores/global-level-store';
import { useGlobalModalityStore } from '@/stores/global-modality-store';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { DEFAULT_SELECT_TOKENS } from '@/hooks/useSelectState';
import { standardizeSelectValue } from '@/utils/select-validation';

interface ClassFiltersProps {
  filters: ClassFiltersType;
  onFiltersChange: (filters: ClassFiltersType) => void;
}

const grades = [
  '1º ano', '2º ano', '3º ano', '4º ano', '5º ano',
  '6º ano', '7º ano', '8º ano', '9º ano',
  '1º ano EM', '2º ano EM', '3º ano EM'
];

const years = [2023, 2024, 2025, 2026];

export function ClassFilters({ filters, onFiltersChange }: ClassFiltersProps) {
  const { getTeachers } = usePeopleStore();
  const { levels, loadLevels, getActiveLevels } = useGlobalLevelStore();
  const { modalities, loadModalities, getActiveModalities } = useGlobalModalityStore();
  const [searchInput, setSearchInput] = useState(filters.search);
  
  useEffect(() => {
    loadLevels();
    loadModalities();
  }, [loadLevels, loadModalities]);
  
  const teachers = getTeachers();
  const activeLevels = getActiveLevels();
  const activeModalities = getActiveModalities();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleClearFilters = () => {
    const clearedFilters: ClassFiltersType = { search: '' };
    setSearchInput('');
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.year || filters.grade || filters.teacher || filters.status || filters.levelId || filters.modalityId;

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filtros</h3>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>

        {/* Year */}
        <Select 
          value={filters.year?.toString() || DEFAULT_SELECT_TOKENS.ALL_YEARS} 
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              year: value === DEFAULT_SELECT_TOKENS.ALL_YEARS ? undefined : parseInt(value)
            })
          }
        >
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Todos os anos" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_YEARS}>Todos os anos</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Grade */}
        <Select 
          value={filters.grade || DEFAULT_SELECT_TOKENS.ALL_GRADES} 
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              grade: value === DEFAULT_SELECT_TOKENS.ALL_GRADES ? undefined : value
            })
          }
        >
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Todas as séries" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_GRADES}>Todas as séries</SelectItem>
            {grades.map(grade => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Teacher */}
        <Select 
          value={filters.teacher || DEFAULT_SELECT_TOKENS.ALL_TEACHERS} 
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              teacher: value === DEFAULT_SELECT_TOKENS.ALL_TEACHERS ? undefined : value
            })
          }
        >
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Todos os professores" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_TEACHERS}>Todos os professores</SelectItem>
            {teachers.map(teacher => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Level */}
        <Select 
          value={filters.levelId || DEFAULT_SELECT_TOKENS.ALL_LEVELS} 
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              levelId: value === DEFAULT_SELECT_TOKENS.ALL_LEVELS ? undefined : value
            })
          }
        >
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Todos os níveis" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_LEVELS}>Todos os níveis</SelectItem>
            {activeLevels.map(level => (
              <SelectItem key={level.id} value={level.id}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Modality */}
        <Select 
          value={filters.modalityId || DEFAULT_SELECT_TOKENS.ALL_MODALITIES} 
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              modalityId: value === DEFAULT_SELECT_TOKENS.ALL_MODALITIES ? undefined : value
            })
          }
        >
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Todas as modalidades" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_MODALITIES}>Todas as modalidades</SelectItem>
            {activeModalities.map(modality => (
              <SelectItem key={modality.id} value={modality.id}>
                {modality.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select 
          value={filters.status || DEFAULT_SELECT_TOKENS.ALL_STATUS} 
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              status: value === DEFAULT_SELECT_TOKENS.ALL_STATUS ? undefined : value as any
            })
          }
        >
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_STATUS}>Todos</SelectItem>
            <SelectItem value="ATIVA">Ativas</SelectItem>
            <SelectItem value="ARQUIVADA">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}