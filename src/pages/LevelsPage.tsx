import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelStore } from '@/stores/level-store';
import { useProgramStore } from '@/stores/program-store';
import { LevelFilters } from '@/types/curriculum';
import { AppLayout } from '@/components/Layout/AppLayout';
import { LevelTable } from '@/components/curriculum/LevelTable';
import { LevelFilters as LevelFiltersComponent } from '@/components/curriculum/LevelFilters';
import { LevelFormModal } from '@/components/curriculum/LevelFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function LevelsPage() {
  const { user } = useAuth();
  const { loadLevels } = useLevelStore();
  const { loadPrograms } = useProgramStore();
  const [filters, setFilters] = useState<LevelFilters>({
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadLevels();
    loadPrograms();
  }, [loadLevels, loadPrograms]);

  // RBAC: Only secretaria can access
  if (!user || user.role !== 'secretaria') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Níveis</h1>
            <p className="text-muted-foreground">
              Gerencie níveis por programa
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="glass-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Nível
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-soft glass-hover p-4">
          <LevelFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </div>

        {/* Table */}
        <div className="glass p-6">
          <LevelTable filters={filters} />
        </div>

        {/* Create Modal */}
        <LevelFormModal 
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </AppLayout>
  );
}