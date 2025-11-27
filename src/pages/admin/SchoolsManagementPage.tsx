import { useState, useEffect } from 'react';
import { useSchools } from '@/hooks/useSchools';
import { useSchoolFeatures } from '@/hooks/useSchoolFeatures';
import { useSubscription } from '@/hooks/useSubscription';
import { School } from '@/types/school';
import { SchoolFormModal } from '@/components/admin/SchoolFormModal';
import { SchoolFeaturesModal } from '@/components/admin/SchoolFeaturesModal';
import { DeleteSchoolModal } from '@/components/admin/DeleteSchoolModal';
import { UpgradeSchoolModal } from '@/components/admin/UpgradeSchoolModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Search, Plus, Settings, Edit, MoreVertical, Trash2, Users, BookOpen, UserCog, Loader2 } from 'lucide-react';

// Component for individual school card
function SchoolCard({
  school,
  stats,
  onEdit,
  onFeatures,
  onDelete
}: {
  school: School;
  stats: any;
  onEdit: (school: School) => void;
  onFeatures: (school: School) => void;
  onDelete: (school: School) => void;
}) {
  // ✅ Hook called at component level, not inside map()
  const { features } = useSchoolFeatures(school.id);
  const activeFeatures = features.filter(f => f.enabled);

  return (
    <Card key={school.id} className="glass-card p-6 hover:border-primary/50 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏫</span>
            <div>
              <h3 className="text-xl font-bold">{school.name}</h3>
              <p className="text-sm text-muted-foreground">slug: {school.slug}</p>
            </div>
            {school.is_active && (
              <Badge variant="outline" className="border-green-500/50 text-green-500">
                ✅ Ativa
              </Badge>
            )}
          </div>

          {stats ? (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{stats.totalStudents} alunos</span>
              </div>
              <div className="flex items-center gap-1">
                <UserCog className="h-4 w-4" />
                <span>{stats.totalTeachers} professores</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{stats.totalClasses} turmas</span>
              </div>
            </div>
          ) : (
            <div className="h-6 mb-3" />
          )}

          <div className="flex flex-wrap gap-2">
            {activeFeatures.length > 0 ? (
              activeFeatures.map(feature => (
                <Badge key={feature.key} variant="secondary" className="glass-badge">
                  {feature.icon} {feature.label}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                Nenhuma funcionalidade ativada
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onFeatures(school)}
            variant="outline"
            className="glass-button"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Funcionalidades
          </Button>
          <Button
            onClick={() => onEdit(school)}
            variant="outline"
            className="glass-button"
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card">
              <DropdownMenuItem
                onClick={() => onDelete(school)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

export default function SchoolsManagementPage() {
  const { schools, isLoading, createSchool, updateSchool, getSchoolStats, refetch } = useSchools();
  const { canAddSchools } = useSubscription();
  const [searchTerm, setSearchTerm] = useState('');
  const [formModal, setFormModal] = useState<{ open: boolean; school: School | null }>({
    open: false,
    school: null
  });
  const [featuresModal, setFeaturesModal] = useState<{ open: boolean; school: School | null }>({
    open: false,
    school: null
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; school: School | null }>({
    open: false,
    school: null
  });
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [schoolStats, setSchoolStats] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

  // Load stats for all schools
  useEffect(() => {
    schools.forEach(async (school) => {
      if (!schoolStats[school.id] && !loadingStats[school.id]) {
        setLoadingStats(prev => ({ ...prev, [school.id]: true }));
        const stats = await getSchoolStats(school.id);
        setSchoolStats(prev => ({ ...prev, [school.id]: stats }));
        setLoadingStats(prev => ({ ...prev, [school.id]: false }));
      }
    });
  }, [schools]);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    // Check if user can add more schools
    if (!canAddSchools) {
      setUpgradeModal(true);
      return;
    }
    setFormModal({ open: true, school: null });
  };

  const handleEdit = (school: School) => {
    setFormModal({ open: true, school });
  };

  const handleFeatures = (school: School) => {
    setFeaturesModal({ open: true, school });
  };

  const handleDelete = (school: School) => {
    setDeleteModal({ open: true, school });
  };

  const handleFormSubmit = async (data: any) => {
    if (formModal.school) {
      await updateSchool(formModal.school.id, data);
    } else {
      await createSchool(data);
    }
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold gradient-text">Gerenciar Escolas</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie suas unidades escolares e configurações
        </p>
      </div>

      {/* Search and Actions */}
      <Card className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-10"
            />
          </div>
          <Button onClick={handleCreate} className="glass-button w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Escola
          </Button>
        </div>
      </Card>

      {/* Schools List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSchools.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'Tente ajustar os termos de busca' 
              : 'Comece criando sua primeira unidade escolar'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreate} className="glass-button">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Escola
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSchools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              stats={schoolStats[school.id]}
              onEdit={handleEdit}
              onFeatures={handleFeatures}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SchoolFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal({ open, school: null })}
        school={formModal.school}
        onSubmit={handleFormSubmit}
      />

      <SchoolFeaturesModal
        open={featuresModal.open}
        onOpenChange={(open) => setFeaturesModal({ open, school: null })}
        school={featuresModal.school}
      />

      <DeleteSchoolModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, school: null })}
        school={deleteModal.school}
        onSuccess={refetch}
      />

      <UpgradeSchoolModal
        open={upgradeModal}
        onOpenChange={setUpgradeModal}
      />
    </div>
  );
}
