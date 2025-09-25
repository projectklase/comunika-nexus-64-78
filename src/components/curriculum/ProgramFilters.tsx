import { useState } from 'react';
import type { ProgramFilters } from '@/types/curriculum';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface ProgramFiltersProps {
  filters: ProgramFilters;
  onFiltersChange: (filters: ProgramFilters) => void;
}

export function ProgramFilters({ filters, onFiltersChange }: ProgramFiltersProps) {
  const [search, setSearch] = useState(filters.search);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value: string) => {
    const isActive = value === 'active' ? true : value === 'inactive' ? false : undefined;
    onFiltersChange({ ...filters, isActive });
  };

  const clearFilters = () => {
    setSearch('');
    onFiltersChange({ search: '' });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar programas..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 glass-input"
        />
      </div>

      <Select onValueChange={handleStatusChange} value={
        filters.isActive === true ? 'active' : 
        filters.isActive === false ? 'inactive' : 'all'
      }>
        <SelectTrigger className="w-40 glass-input">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="glass-card">
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>

      <Button 
        variant="outline" 
        onClick={clearFilters}
        className="glass-button"
        disabled={!filters.search && filters.isActive === undefined}
      >
        <X className="h-4 w-4 mr-2" />
        Limpar
      </Button>
    </div>
  );
}