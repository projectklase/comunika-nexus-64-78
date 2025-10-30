import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogoLevelsTab } from '@/components/catalogo/CatalogoLevelsTab';
import { CatalogoSubjectsTab } from '@/components/catalogo/CatalogoSubjectsTab';
import { CatalogoModalitiesTab } from '@/components/catalogo/CatalogoModalitiesTab';
import { SchoolEvaluationTab } from '@/components/settings/SchoolEvaluationTab';
import { Layers, BookOpen, Target, Settings } from 'lucide-react';
import { canAccessManagement } from '@/utils/auth-helpers';

export default function CatalogoPage() {
  const { user } = useAuth();

  // RBAC: Only management roles can access
  if (!canAccessManagement(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Catálogo Global</h1>
          <p className="text-muted-foreground">
            Gerencie níveis, matérias e modalidades do sistema
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="glass p-6">
        <Tabs defaultValue="levels" className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass-soft">
            <TabsTrigger value="levels" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Níveis
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Matérias
            </TabsTrigger>
            <TabsTrigger value="modalities" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Modalidades
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Avaliação
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="levels" className="space-y-4">
            <CatalogoLevelsTab />
          </TabsContent>
          
          <TabsContent value="subjects" className="space-y-4">
            <CatalogoSubjectsTab />
          </TabsContent>
          
          <TabsContent value="modalities" className="space-y-4">
            <CatalogoModalitiesTab />
          </TabsContent>
          
          <TabsContent value="evaluation" className="space-y-4">
            <SchoolEvaluationTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}