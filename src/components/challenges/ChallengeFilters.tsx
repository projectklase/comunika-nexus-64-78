import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { getChallengeTypeLabel } from '@/constants/challenge-labels';

interface ChallengeFiltersProps {
  typeFilter: string;
  searchQuery: string;
  onTypeFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
}

export function ChallengeFilters({
  typeFilter,
  searchQuery,
  onTypeFilterChange,
  onSearchQueryChange,
}: ChallengeFiltersProps) {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar desafios..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os tipos</SelectItem>
          <SelectItem value="DAILY">{getChallengeTypeLabel('DAILY')}</SelectItem>
          <SelectItem value="WEEKLY">{getChallengeTypeLabel('WEEKLY')}</SelectItem>
          <SelectItem value="ACHIEVEMENT">{getChallengeTypeLabel('ACHIEVEMENT')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
