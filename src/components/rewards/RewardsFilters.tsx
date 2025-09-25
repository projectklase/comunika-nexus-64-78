import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface RewardsFiltersProps {
  searchTerm: string;
  sortBy: 'name' | 'price-asc' | 'price-desc';
  onSearchChange: (term: string) => void;
  onSortChange: (sort: 'name' | 'price-asc' | 'price-desc') => void;
  onClearFilters: () => void;
}

export function RewardsFilters({
  searchTerm,
  sortBy,
  onSearchChange,
  onSortChange,
  onClearFilters
}: RewardsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-6 bg-muted/5 rounded-lg border border-border/50">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar itens da loja..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
            <SelectItem value="price-asc">Preço (Menor)</SelectItem>
            <SelectItem value="price-desc">Preço (Maior)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {(searchTerm || sortBy !== 'name') && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="shrink-0"
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}