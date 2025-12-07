import { ActivityType, PostStatus } from '@/types/post';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, FileText, FolderOpen, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';

// Import tokens from useSelectState for consistency
import { DEFAULT_SELECT_TOKENS } from '@/hooks/useSelectState';
import { standardizeSelectValue, validateSelectItemValue } from '@/utils/select-validation';

interface ActivityFiltersProps {
  selectedType?: ActivityType;
  selectedStatus?: PostStatus;
  selectedDeadline?: 'upcoming' | 'overdue' | 'today';
  onTypeChange: (type?: ActivityType) => void;
  onStatusChange: (status?: PostStatus) => void;
  onDeadlineChange: (deadline?: 'upcoming' | 'overdue' | 'today') => void;
  onClearAll: () => void;
}

const activityTypes = [
  { type: 'ATIVIDADE' as const, label: 'Atividade', icon: FileText, color: 'text-blue-600' },
  { type: 'TRABALHO' as const, label: 'Trabalho', icon: FolderOpen, color: 'text-orange-600' },
  { type: 'PROVA' as const, label: 'Prova', icon: ClipboardCheck, color: 'text-red-600' }
];

const statusOptions = [
  { value: 'PUBLISHED' as const, label: 'Publicado' },
  { value: 'SCHEDULED' as const, label: 'Agendado' },
  { value: 'ARCHIVED' as const, label: 'Arquivado' }
];

const deadlineOptions = [
  { value: 'today' as const, label: 'Vence hoje' },
  { value: 'upcoming' as const, label: 'Próximos' },
  { value: 'overdue' as const, label: 'Atrasados' }
];

export function ActivityFilters({
  selectedType,
  selectedStatus,
  selectedDeadline,
  onTypeChange,
  onStatusChange,
  onDeadlineChange,
  onClearAll
}: ActivityFiltersProps) {
  const weightsEnabled = useWeightsEnabled();
  const hasFilters = selectedType || selectedStatus || selectedDeadline;

  return (
    <div className="flex flex-col gap-4 items-start w-full">
      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 w-full">
        {activityTypes.map(({ type, label, icon: Icon, color }) => (
          <Button
            key={type}
            variant={selectedType === type ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeChange(selectedType === type ? undefined : type)}
            className={cn(
              "h-8 min-h-10 sm:min-h-8 gap-2 flex-1 sm:flex-none",
              selectedType === type && "shadow-sm"
            )}
          >
            <Icon className={cn("h-3 w-3", selectedType === type ? "text-white" : color)} />
            {label}
            {selectedType === type && <X className="h-3 w-3 ml-1" />}
          </Button>
        ))}
      </div>

      {/* Status and Deadline Filters */}
      <div className="flex flex-wrap gap-2 w-full">
        <Select 
          value={standardizeSelectValue(selectedStatus, 'status')} 
          onValueChange={(value) => {
            const standardized = standardizeSelectValue(value, 'status');
            if (standardized === DEFAULT_SELECT_TOKENS.ALL_STATUS) {
              onStatusChange(undefined);
            } else {
              onStatusChange(value as PostStatus);
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[140px] h-8 min-h-10 sm:min-h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_STATUS}>Todos os status</SelectItem>
            {statusOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={standardizeSelectValue(selectedDeadline, 'periods')} 
          onValueChange={(value) => {
            const standardized = standardizeSelectValue(value, 'periods');
            if (standardized === DEFAULT_SELECT_TOKENS.ALL_PERIODS) {
              onDeadlineChange(undefined);
            } else {
              onDeadlineChange(value as 'upcoming' | 'overdue' | 'today');
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[140px] h-8 min-h-10 sm:min-h-8">
            <SelectValue placeholder="Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_PERIODS}>Todos os prazos</SelectItem>
            {deadlineOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear All Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar filtros
        </Button>
      )}

      {/* Active Filters Count */}
      {hasFilters && (
        <Badge variant="secondary" className="h-6">
          <Filter className="h-3 w-3 mr-1" />
          {[selectedType, selectedStatus, selectedDeadline].filter(Boolean).length} filtro(s)
        </Badge>
      )}
    </div>
  );
}