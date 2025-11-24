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
import { QuickCreateProgramSheet } from './QuickCreateProgramSheet';

interface Program {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
}

interface SmartProgramSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  programs: Program[];
  onProgramCreated?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SmartProgramSelect({
  value,
  onValueChange,
  programs,
  onProgramCreated,
  disabled = false,
  className,
}: SmartProgramSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const selectedProgram = programs.find((program) => program.id === value);

  const filteredPrograms = useMemo(() => {
    if (!searchTerm) return programs;
    return programs.filter((program) =>
      program.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [programs, searchTerm]);

  const handleProgramCreated = (programId: string) => {
    onValueChange(programId);
    setShowCreateSheet(false);
    setSearchTerm('');
    setOpen(false);
    onProgramCreated?.();
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
            {selectedProgram ? (
              <span>
                {selectedProgram.name}
                {selectedProgram.code && (
                  <span className="text-muted-foreground ml-1">
                    ({selectedProgram.code})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Selecione o programa</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar ou criar programa..."
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
                      Criar programa: "{searchTerm}"
                    </span>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-center py-6">Nenhum programa encontrado</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredPrograms.map((program) => (
                <CommandItem
                  key={program.id}
                  value={program.id}
                  onSelect={() => {
                    onValueChange(program.id);
                    setOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === program.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {program.name}
                  {program.code && (
                    <span className="ml-1 text-muted-foreground">
                      ({program.code})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickCreateProgramSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onProgramCreated={handleProgramCreated}
        initialName={searchTerm}
      />
    </>
  );
}
