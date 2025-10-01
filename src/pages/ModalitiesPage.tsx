import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModalities } from '@/hooks/useModalities';
import { useProgramStore } from '@/stores/program-store';
import { AppLayout } from '@/components/Layout/AppLayout';
import { ModalityTable } from '@/components/curriculum/ModalityTable';
import { ModalityFilters as ModalityFiltersComponent } from '@/components/curriculum/ModalityFilters';
import { ModalityFormModal } from '@/components/curriculum/ModalityFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function ModalitiesPage() {
  const { user } = useAuth();
  const { loadPrograms } = useProgramStore();
  const [filters, setFilters] = useState({ search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

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
            <h1 className="text-3xl font-bold gradient-text">Modalidades</h1>
            <p className="text-muted-foreground">
              Gerencie modalidades por programa
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="glass-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Modalidade
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-soft glass-hover p-4">
          <ModalityFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </div>

        {/* Table */}
        <div className="glass p-6">
          <ModalityTable filters={filters} />
        </div>

        {/* Create Modal */}
        <ModalityFormModal 
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </AppLayout>
  );
}