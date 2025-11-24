import { useState, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFamilyMetrics } from '@/hooks/useFamilyMetrics';
import { useSchool } from '@/contexts/SchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, 
  Users, 
  Download, 
  Search,
  Mail,
  Phone,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Network,
  TreePine,
  UserCircle2,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { RELATIONSHIP_LABELS, type RelationshipType, type FamilyGroup } from '@/types/family-metrics';
import { exportFamilyRelationsToExcel } from '@/utils/family-relations-export';
import { FamilyTreeVisualization } from '@/components/family-tree/FamilyTreeVisualization';
import { useFamilyRelationsState } from '@/hooks/useFamilyRelationsState';
import { useQueryClient } from '@tanstack/react-query';


export default function FamilyRelationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentSchool } = useSchool();
  const { data: metrics, isLoading: metricsLoading } = useFamilyMetrics();
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ✅ Estado global compartilhado (Fase 4)
  const {
    selectedFamilyKey,
    searchTerm,
    activeTab,
    setSelectedFamilyKey,
    setSearchTerm,
    setActiveTab,
    navigateToTree,
  } = useFamilyRelationsState();

  // ✅ Estado local para input sem debounce (Fase 4.1)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // ✅ Sincronizar debounced search com estado global (Fase 4.1)
  useEffect(() => {
    setSearchTerm(debouncedSearch);
  }, [debouncedSearch, setSearchTerm]);

  // ✅ Ref para scroll automático na lista
  const familyCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadFamilyDetails = async () => {
    if (!currentSchool) return;
    
    setLoadingFamilies(true);
    try {
      // Buscar todas as famílias com múltiplos alunos
      const { data: guardiansData } = await supabase
        .from('guardians')
        .select(`
          id,
          name,
          email,
          phone,
          student_id,
          profiles:student_id (
            id,
            name,
            avatar
          )
        `);

      if (!guardiansData) return;

      // Agrupar por email ou telefone
      const familyMap = new Map<string, FamilyGroup>();

      for (const guardian of guardiansData) {
        const key = guardian.email || guardian.phone || '';
        if (!key) continue;

        // Verificar se estudante pertence à escola atual
        const { data: membership } = await supabase
          .from('school_memberships')
          .select('user_id')
          .eq('user_id', guardian.student_id)
          .eq('school_id', currentSchool.id)
          .eq('role', 'aluno')
          .single();

        if (!membership) continue;

        const student = Array.isArray(guardian.profiles) 
          ? guardian.profiles[0] 
          : guardian.profiles;

        if (!familyMap.has(key)) {
          familyMap.set(key, {
            family_key: key,
            guardian_name: guardian.name,
            guardian_email: guardian.email,
            guardian_phone: guardian.phone,
            students: [],
            student_count: 0,
            registered_relationships: 0,
          });
        }

        const family = familyMap.get(key)!;
        
        // Evitar duplicatas
        if (!family.students.find(s => s.id === student.id)) {
          family.students.push({
            id: student.id,
            name: student.name,
            avatar: student.avatar,
          });
          family.student_count = family.students.length;
        }
      }

      // Filtrar apenas famílias com 2+ alunos
      const multiFamilies = Array.from(familyMap.values())
        .filter(f => f.student_count > 1)
        .sort((a, b) => b.student_count - a.student_count);

      setFamilies(multiFamilies);
    } catch (error) {
      console.error('Erro ao carregar famílias:', error);
      toast.error('Erro ao carregar detalhes das famílias');
    } finally {
      setLoadingFamilies(false);
    }
  };

  const handleExport = async () => {
    if (!metrics || !currentSchool) {
      toast.error('Dados não disponíveis para exportação');
      return;
    }

    setIsExporting(true);
    try {
      await exportFamilyRelationsToExcel(metrics, families, currentSchool.name);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  // ✅ SOLUÇÃO 2: Função de recarregar manual
  const handleRefresh = async () => {
    const toastId = toast.loading('Atualizando dados...');
    try {
      await queryClient.invalidateQueries({ queryKey: ['family-metrics'] });
      await loadFamilyDetails();
      toast.success('Dados atualizados!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar dados', { id: toastId });
    }
  };

  // ✅ Filtro de famílias usando busca global (Fase 4)
  const filteredFamilies = families.filter(family =>
    family.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.students.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    family.guardian_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Scroll automático para família selecionada na lista (Fase 4)
  useEffect(() => {
    if (selectedFamilyKey && activeTab === 'list') {
      const cardElement = familyCardRefs.current.get(selectedFamilyKey);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedFamilyKey, activeTab]);

  return (
    <div className="min-h-screen bg-background p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/dashboard')}
            className="hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* ✅ SOLUÇÃO 2: Botão de Recarregar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={metricsLoading || loadingFamilies}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          
          <div>
            <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
              <Heart className="h-8 w-8 text-pink-400" />
              Relações Familiares
            </h1>
            <p className="text-muted-foreground mt-2">
              Análise de vínculos familiares e responsáveis compartilhados
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleExport}
          disabled={isExporting || !metrics}
          className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 gap-2"
        >
          {isExporting ? (
            <>
              <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </>
          )}
        </Button>
      </div>

      {/* Métricas Resumidas */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card border-pink-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Famílias Multi-Alunos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-pink-400">
                  {metrics.multi_student_families}
                </span>
                <Users className="h-10 w-10 text-pink-400/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                de {metrics.total_families} famílias totais
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Média Alunos/Família
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-purple-400">
                  {metrics.avg_students_per_family.toFixed(1)}
                </span>
                <TrendingUp className="h-10 w-10 text-purple-400/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                alunos por responsável
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-rose-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Parentescos Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-rose-400">
                  {metrics.relationship_distribution.reduce((sum, r) => sum + r.count, 0)}
                </span>
                <BarChart3 className="h-10 w-10 text-rose-400/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                vínculos documentados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribuição de Parentescos */}
      {metrics && metrics.relationship_distribution.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Distribuição de Parentescos
            </CardTitle>
            <CardDescription>
              Tipos de relações familiares registradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {metrics.relationship_distribution.map((rel) => (
                <div
                  key={rel.relationship_type}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30"
                >
                  <span className="text-sm font-medium text-foreground">
                    {RELATIONSHIP_LABELS[rel.relationship_type as RelationshipType] || rel.relationship_type}
                  </span>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {rel.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Busca Global com botão limpar (Fase 4 + 4.2) */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        
        <Input
          placeholder="Buscar responsável, aluno ou email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-12 pr-32 h-12 text-base bg-background/50 backdrop-blur-sm border-border"
        />
        
        {/* ✅ Botão X para limpar busca (Fase 4.2) */}
        {searchInput.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchInput('')}
            className="absolute right-24 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50"
            title="Limpar busca"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        
        {filteredFamilies.length > 0 && families.length > 0 && (
          <Badge 
            variant="secondary" 
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary/10 text-primary border-primary/30"
          >
            {filteredFamilies.length} de {families.length} famílias
          </Badge>
        )}
      </div>

      {/* Visualização: Lista ou Árvore (Fase 4: controlado por estado global) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'tree')} className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <Users className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-2">
            <Network className="h-4 w-4" />
            Árvore Genealógica
          </TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Lista */}
        <TabsContent value="list">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-400" />
                    Famílias com Múltiplos Alunos
                  </CardTitle>
                  <CardDescription>
                    Visualize e gerencie responsáveis compartilhados
                  </CardDescription>
                </div>
                <Button
                  onClick={loadFamilyDetails}
                  disabled={loadingFamilies}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {loadingFamilies ? (
                    <>
                      <div className="h-3 w-3 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      Carregar Detalhes
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {loadingFamilies ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : families.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">
                      Clique em "Carregar Detalhes" para visualizar as famílias
                    </p>
                  </div>
                ) : filteredFamilies.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">
                      Nenhuma família encontrada com esse critério
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFamilies.map((family) => {
                      const isSelected = selectedFamilyKey === family.family_key;
                      
                      return (
                        <div
                          key={family.family_key}
                          ref={(el) => {
                            if (el) familyCardRefs.current.set(family.family_key, el);
                            else familyCardRefs.current.delete(family.family_key);
                          }}
                          className={`
                            p-5 rounded-xl transition-all duration-300
                            ${isSelected 
                              ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-2 border-pink-500 shadow-lg shadow-pink-500/20'
                              : 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-pink-500/30'
                            }
                          `}
                        >
                          {/* Badge "EM FOCO" (Fase 4) */}
                          {isSelected && (
                            <Badge className="mb-3 bg-pink-500 text-white border-0 animate-pulse">
                              EM FOCO
                            </Badge>
                          )}

                          <div className="flex items-start justify-between mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-pink-400" />
                                <h3 className="font-semibold text-lg text-foreground">
                                  {family.guardian_name}
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {family.guardian_email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {family.guardian_email}
                                  </div>
                                )}
                                {family.guardian_phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {family.guardian_phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">
                              {family.student_count} alunos
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {family.students.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors"
                              >
                                {student.avatar ? (
                                  <img
                                    src={student.avatar}
                                    alt={student.name}
                                    className="h-6 w-6 rounded-full"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                    {student.name.charAt(0)}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-foreground">
                                  {student.name}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* ✅ Quick Actions (Fase 4) */}
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigateToTree(family.family_key)}
                              className="gap-2 border-pink-500/30 hover:bg-pink-500/10 hover:border-pink-500"
                            >
                              <TreePine className="h-3.5 w-3.5" />
                              Ver na Árvore
                            </Button>
                            {family.guardian_email && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`mailto:${family.guardian_email}`, '_blank')}
                                className="gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Enviar Email
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const studentIds = family.students.map(s => s.id).join(',');
                                navigate(`/admin/alunos?ids=${studentIds}`);
                              }}
                              className="gap-2 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500"
                            >
                              <UserCircle2 className="h-3.5 w-3.5" />
                              Ver Alunos
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 2: Árvore Genealógica */}
        <TabsContent value="tree">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-pink-400" />
                    Visualização em Grafo
                  </CardTitle>
                  <CardDescription>
                    Explore as conexões familiares de forma interativa
                  </CardDescription>
                </div>
                <Button
                  onClick={loadFamilyDetails}
                  disabled={loadingFamilies}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {loadingFamilies ? (
                    <>
                      <div className="h-3 w-3 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      Carregar Dados
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {families.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">
                    Clique em "Carregar Dados" para visualizar o grafo de famílias
                  </p>
                </div>
              ) : (
                <FamilyTreeVisualization 
                  families={families}
                  searchTerm={searchTerm}
                  selectedFamilyKey={selectedFamilyKey}
                  onFamilySelect={setSelectedFamilyKey}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
