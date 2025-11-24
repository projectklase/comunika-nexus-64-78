
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/hooks/useClasses';
import { useClassExport } from '@/hooks/useClassExport';
import { ClassFilters } from '@/types/class';
import { AppLayout } from '@/components/Layout/AppLayout';
import { ClassTable } from '@/components/classes/ClassTable';
import { ClassFilters as ClassFiltersComponent } from '@/components/classes/ClassFilters';
import { ClassFormModal } from '@/components/classes/ClassFormModal';
import { CSVImportModal } from '@/components/import/CSVImportModal';
import { ImportHistoryModal } from '@/components/import/ImportHistoryModal';
import { SplitButton } from '@/components/ui/split-button';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { canAccessManagement } from '@/utils/auth-helpers';

export default function ClassesPage() {
  const { user } = useAuth();
  const { loadClasses } = useClasses();
  const {
    exportClassesSummary,
    exportClassesDetailed,
    exportStudentsByClass,
  } = useClassExport();
  
  const [filters, setFilters] = useState<ClassFilters>({
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // RBAC: Only management roles can access
  if (!canAccessManagement(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ Função para recarregar lista após criar/editar turma
  const handleClassCreated = async () => {
    console.log('🔄 [ClassesPage] Recarregando lista de turmas...');
    await loadClasses();
    console.log('✅ [ClassesPage] Lista de turmas atualizada');
  };

  const handleMainExport = () => {
    exportClassesSummary(filters);
  };

  const exportMenuItems = [
    {
      label: 'Importar CSV...',
      onClick: () => setShowImportModal(true),
      separator: false,
    },
    {
      label: 'Exportar / Turmas (resumo)',
      onClick: () => exportClassesSummary(filters),
      separator: true,
    },
    {
      label: 'Exportar / Turmas (detalhado)',
      onClick: () => exportClassesDetailed(filters),
    },
    {
      label: 'Exportar / Alunos por Turma',
      onClick: () => exportStudentsByClass(filters),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Turmas</h1>
            <p className="text-muted-foreground">
              Gerencie turmas, professores e alunos
            </p>
          </div>
          <div className="flex gap-2">
            <ImportHistoryModal />
            <SplitButton
              onMainAction={handleMainExport}
              menuItems={exportMenuItems}
              className="glass-button"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar (Resumo)
            </SplitButton>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="glass-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Turma
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-soft glass-hover p-4">
          <ClassFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </div>

        {/* Table */}
        <div className="glass p-6">
          <ClassTable filters={filters} />
        </div>

        {/* Create Modal */}
        <ClassFormModal 
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={handleClassCreated}
        />

        {/* Import Modal */}
        <CSVImportModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      </div>
    </AppLayout>
  );
}
