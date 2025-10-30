import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubjects } from '@/hooks/useSubjects';
import { useProgramStore } from '@/stores/program-store';
import { AppLayout } from '@/components/Layout/AppLayout';
import { SubjectTable } from '@/components/curriculum/SubjectTable';
import { SubjectFilters as SubjectFiltersComponent } from '@/components/curriculum/SubjectFilters';
import { SubjectFormModal } from '@/components/curriculum/SubjectFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { canAccessManagement } from '@/utils/auth-helpers';

export default function SubjectsPage() {
  const { user } = useAuth();
  const { loadPrograms } = useProgramStore();
  const [filters, setFilters] = useState({ search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  // RBAC: Only management roles can access
  if (!canAccessManagement(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Matérias</h1>
            <p className="text-muted-foreground">
              Gerencie matérias e disciplinas
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="glass-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Matéria
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-soft glass-hover p-4">
          <SubjectFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </div>

        {/* Table */}
        <div className="glass p-6">
          <SubjectTable filters={filters} />
        </div>

        {/* Create Modal */}
        <SubjectFormModal 
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </AppLayout>
  );
}