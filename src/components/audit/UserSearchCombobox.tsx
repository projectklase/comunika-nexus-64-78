import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User, Search } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePeopleStore } from '@/stores/people-store';
import { useDebounce } from '@/hooks/useDebounce';
import { getRoleLabel } from '@/utils/audit-helpers';

interface UserSearchComboboxProps {
  value: string;
  onSelect: (userId: string) => void;
  placeholder?: string;
}

export function UserSearchCombobox({ value, onSelect, placeholder = "Buscar usuário..." }: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { getTeachers, getStudents } = usePeopleStore();
  const teachers = getTeachers();
  const students = getStudents();
  const allUsers = [...teachers, ...students];
  
  // Filtrar usuários baseado na busca
  const filteredUsers = allUsers
    .filter(user => {
      if (debouncedSearch.length < 2) return false;
      const query = debouncedSearch.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.role && user.role.toLowerCase().includes(query))
      );
    })
    .slice(0, 20); // Limitar a 20 resultados
  
  // Encontrar usuário selecionado
  const selectedUser = allUsers.find(user => user.id === value);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between glass-input"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.name}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {getRoleLabel(selectedUser.role)}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Todos os usuários</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 glass-card" align="start">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border/50 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Digite nome, email ou role..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>
              {searchQuery.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </CommandEmpty>
            
            {/* Opção "Todos os usuários" */}
            <CommandGroup>
              <CommandItem
                value="ALL_USERS"
                onSelect={() => {
                  onSelect('ALL_USERS');
                  setOpen(false);
                  setSearchQuery('');
                }}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Todos os usuários</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === 'ALL_USERS' ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            </CommandGroup>
            
            {/* Resultados filtrados */}
            {filteredUsers.length > 0 && (
              <CommandGroup heading={`${filteredUsers.length} resultado(s)`}>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={(currentValue) => {
                      onSelect(currentValue);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === user.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
