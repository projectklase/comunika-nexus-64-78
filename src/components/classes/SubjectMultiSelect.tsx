import { useState } from 'react';

type Subject = { 
  id: string; 
  name: string; 
  code?: string | null; 
};
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronDown } from 'lucide-react';

interface SubjectMultiSelectProps {
  subjects: Subject[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function SubjectMultiSelect({ 
  subjects, 
  selectedIds, 
  onSelectionChange 
}: SubjectMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSubjects = subjects.filter(s => selectedIds.includes(s.id));

  const handleToggleSubject = (subjectId: string) => {
    const newSelection = selectedIds.includes(subjectId)
      ? selectedIds.filter(id => id !== subjectId)
      : [...selectedIds, subjectId];
    onSelectionChange(newSelection);
  };

  const handleRemoveSubject = (subjectId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== subjectId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between glass-input"
            type="button"
          >
            <span className="text-muted-foreground">
              {selectedIds.length === 0 
                ? 'Selecione matérias...' 
                : `${selectedIds.length} matéria(s) selecionada(s)`
              }
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 glass-card p-0" align="start">
          <div className="p-3 border-b border-border/50">
            <Input
              placeholder="Buscar matérias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredSubjects.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground">
                Nenhuma matéria encontrada
              </div>
            ) : (
              filteredSubjects.map((subject) => (
                <div 
                  key={subject.id} 
                  className="flex items-center space-x-2 p-3 hover:bg-muted/20 cursor-pointer"
                  onClick={() => handleToggleSubject(subject.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(subject.id)}
                    onChange={() => {}} // Controlled by parent click
                  />
                  <div className="flex-1">
                    <div className="font-medium">{subject.name}</div>
                    {subject.code && (
                      <div className="text-sm text-muted-foreground">{subject.code}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected subjects as chips */}
      {selectedSubjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSubjects.map((subject) => (
            <Badge 
              key={subject.id} 
              variant="secondary" 
              className="flex items-center gap-1 bg-primary/10 text-primary"
            >
              {subject.name}
              <button
                type="button"
                onClick={() => handleRemoveSubject(subject.id)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="text-sm text-muted-foreground self-center">
            {selectedSubjects.length} matéria(s)
          </div>
        </div>
      )}
    </div>
  );
}