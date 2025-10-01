import { useState } from 'react';
import { useModalities } from '@/hooks/useModalities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { CatalogoModalitiesTable } from './CatalogoModalitiesTable';
import { CatalogoModalityFormModal } from './CatalogoModalityFormModal';

export function CatalogoModalitiesTab() {
  const [filters, setFilters] = useState<{ search: string; isActive?: boolean }>({
    search: '',
    isActive: undefined,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const updateFilters = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Modalidades</span>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Modalidade
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar modalidades..."
                value={filters.search}
                onChange={(e) => updateFilters('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
              onValueChange={(value) => 
                updateFilters('isActive', value === 'all' ? undefined : value === 'active')
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CatalogoModalitiesTable filters={filters} />
        </CardContent>
      </Card>

      <CatalogoModalityFormModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
        modality={null} 
      />
    </div>
  );
}