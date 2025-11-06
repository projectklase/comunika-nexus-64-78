import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { QuickCreateModalitySheet } from './QuickCreateModalitySheet';

interface Modality {
  id: string;
  name: string;
  code?: string | null;
  is_active: boolean;
}

interface SmartModalitySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  modalities: Modality[];
  onModalityCreated?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SmartModalitySelect({
  value,
  onValueChange,
  modalities,
  onModalityCreated,
  disabled = false,
  className,
}: SmartModalitySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const selectedModality = modalities.find((modality) => modality.id === value);

  const filteredModalities = useMemo(() => {
    if (!searchTerm) return modalities;
    return modalities.filter((modality) =>
      modality.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [modalities, searchTerm]);

  const handleModalityCreated = (modalityId: string) => {
    onValueChange(modalityId);
    setShowCreateSheet(false);
    setSearchTerm('');
    setOpen(false);
    onModalityCreated?.();
  };

  const handleQuickCreate = () => {
    setOpen(false);
    setShowCreateSheet(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between glass-input', className)}
          >
            {selectedModality ? (
              <span>
                {selectedModality.name}
                {selectedModality.code && (
                  <span className="text-muted-foreground ml-1">
                    ({selectedModality.code})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Selecione a modalidade</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar ou criar modalidade..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>
              {searchTerm.trim() ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full text-left text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 whitespace-normal h-auto py-2 min-h-[2.5rem]"
                    onClick={handleQuickCreate}
                  >
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    <span className="break-words">
                      Criar modalidade: "{searchTerm}"
                    </span>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-center py-6">Nenhuma modalidade encontrada</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredModalities.map((modality) => (
                <CommandItem
                  key={modality.id}
                  value={modality.id}
                  onSelect={() => {
                    onValueChange(modality.id);
                    setOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === modality.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {modality.name}
                  {modality.code && (
                    <span className="ml-1 text-muted-foreground">
                      ({modality.code})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickCreateModalitySheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onModalityCreated={handleModalityCreated}
        initialName={searchTerm}
      />
    </>
  );
}
