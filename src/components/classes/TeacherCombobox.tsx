import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTeachers } from '@/hooks/useTeachers';
import { QuickTeacherModal } from '@/components/teachers/QuickTeacherModal';

interface TeacherComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TeacherCombobox({
  value,
  onValueChange,
  placeholder = "Selecione um professor...",
  disabled = false,
}: TeacherComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showQuickTeacher, setShowQuickTeacher] = useState(false);
  const { teachers, fetchTeachers } = useTeachers();

  // Teachers já vêm ativos do hook useTeachers

  const selectedTeacher = teachers.find(t => t.id === value);

  const handleTeacherCreated = async (teacherId: string) => {
    onValueChange(teacherId);
    setShowQuickTeacher(false);
    // Recarregar lista de professores
    await fetchTeachers();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedTeacher ? selectedTeacher.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar professor..." />
            <CommandList>
              <CommandEmpty>Nenhum professor encontrado.</CommandEmpty>
              <CommandGroup>
                {teachers.map((teacher) => (
                  <CommandItem
                    key={teacher.id}
                    value={teacher.id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === teacher.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{teacher.name}</span>
                      <span className="text-xs text-muted-foreground">{teacher.email || 'Sem e-mail'}</span>
                    </div>
                  </CommandItem>
                ))}
                
                {/* Botão para adicionar novo professor */}
                <CommandItem
                  onSelect={() => {
                    setShowQuickTeacher(true);
                    setOpen(false);
                  }}
                  className="border-t border-border mt-1 pt-2"
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">
                    Adicionar novo professor
                  </span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickTeacherModal
        open={showQuickTeacher}
        onOpenChange={setShowQuickTeacher}
        onTeacherCreated={handleTeacherCreated}
      />
    </>
  );
}