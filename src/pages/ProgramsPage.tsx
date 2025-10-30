import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrograms } from '@/hooks/usePrograms';
import { ProgramFilters } from '@/types/curriculum';
import { AppLayout } from '@/components/Layout/AppLayout';
import { ProgramTable } from '@/components/curriculum/ProgramTable';
import { ProgramFilters as ProgramFiltersComponent } from '@/components/curriculum/ProgramFilters';
import { ProgramFormModal } from '@/components/curriculum/ProgramFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { canAccessManagement } from '@/utils/auth-helpers';

export default function ProgramsPage() {
  const { user } = useAuth();
  const { loading } = usePrograms();
  const [filters, setFilters] = useState<ProgramFilters>({
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

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
            <h1 className="text-3xl font-bold gradient-text">Programas</h1>
            <p className="text-muted-foreground">
              Gerencie programas e modalidades
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="glass-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Programa
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-soft glass-hover p-4">
          <ProgramFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </div>

        {/* Table */}
        <div className="glass p-6">
          <ProgramTable filters={filters} />
        </div>

        {/* Create Modal */}
        <ProgramFormModal 
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </AppLayout>
  );
}