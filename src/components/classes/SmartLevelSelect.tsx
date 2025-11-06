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
import { QuickCreateLevelSheet } from './QuickCreateLevelSheet';

interface Level {
  id: string;
  name: string;
  code?: string | null;
  is_active: boolean;
}

interface SmartLevelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  levels: Level[];
  onLevelCreated?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SmartLevelSelect({
  value,
  onValueChange,
  levels,
  onLevelCreated,
  disabled = false,
  className,
}: SmartLevelSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const selectedLevel = levels.find((level) => level.id === value);

  const filteredLevels = useMemo(() => {
    if (!searchTerm) return levels;
    return levels.filter((level) =>
      level.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [levels, searchTerm]);

  const handleLevelCreated = (levelId: string) => {
    onValueChange(levelId);
    setShowCreateSheet(false);
    setSearchTerm('');
    setOpen(false);
    onLevelCreated?.();
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
            {selectedLevel ? (
              <span>
                {selectedLevel.name}
                {selectedLevel.code && (
                  <span className="text-muted-foreground ml-1">
                    ({selectedLevel.code})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Selecione o nível</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar ou criar nível..."
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
                      Criar nível: "{searchTerm}"
                    </span>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-center py-6">Nenhum nível encontrado</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredLevels.map((level) => (
                <CommandItem
                  key={level.id}
                  value={level.id}
                  onSelect={() => {
                    onValueChange(level.id);
                    setOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === level.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {level.name}
                  {level.code && (
                    <span className="ml-1 text-muted-foreground">
                      ({level.code})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickCreateLevelSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onLevelCreated={handleLevelCreated}
        initialName={searchTerm}
      />
    </>
  );
}
