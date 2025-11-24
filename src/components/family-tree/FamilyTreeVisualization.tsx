import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
  ReactFlowProvider,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuardianNode } from './GuardianNode';
import { StudentNode } from './StudentNode';
import { buildFamilyTree } from '@/utils/family-tree-builder';
import { FamilyGroup } from '@/types/family-metrics';
import { useFamilyTreeFilters } from '@/hooks/useFamilyTreeFilters';
import { FamilyTreeFilters } from './FamilyTreeFilters';
import { useFamilyTreeSelection } from '@/hooks/useFamilyTreeSelection';
import { FamilyDetailsSidebar } from './FamilyDetailsSidebar';
import { FamilyBreadcrumb } from './FamilyBreadcrumb';
import { ExportTreeButton } from './ExportTreeButton';
import { useTreeExport } from '@/hooks/useTreeExport';
import { useSchool } from '@/contexts/SchoolContext';
import { StudentFormSteps } from '@/components/students/StudentFormSteps';
import { useStudents } from '@/hooks/useStudents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FamilyTreeVisualizationProps {
  families: FamilyGroup[];
  searchTerm?: string;
  selectedFamilyKey?: string | null;
  onFamilySelect?: (familyKey: string | null) => void;
}

const nodeTypes = {
  guardianNode: GuardianNode,
  studentNode: StudentNode,
};

function FamilyTreeVisualizationInner({ 
  families,
  searchTerm,
  selectedFamilyKey,
  onFamilySelect,
}: FamilyTreeVisualizationProps) {
  const { currentSchool } = useSchool();
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  
  const {
    filters,
    setFilters,
    filteredFamilies,
    totalFamilies,
    filteredCount,
  } = useFamilyTreeFilters(families, searchTerm);

  const [isBuilding, setIsBuilding] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  
  // ✅ Hook de exportação (Fase 4.3)
  const { isExporting, exportToPNG, exportToPDF } = useTreeExport(
    reactFlowWrapperRef,
    currentSchool?.name || 'Escola'
  );

  // Estados para edição de aluno
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  
  const { fetchStudents } = useStudents();

  // ✅ Hook de seleção de família (Fase 3)
  const {
    selectedFamily,
    selectFamily,
    resetSelection,
    selectNextFamily,
    selectPreviousFamily,
  } = useFamilyTreeSelection(filteredFamilies);

  // ✅ Buscar e construir árvore de forma assíncrona
  useEffect(() => {
    async function buildTree() {
      setIsBuilding(true);
      const treeData = await buildFamilyTree(filteredFamilies);
      setNodes(treeData.nodes);
      setEdges(treeData.edges);
      setIsBuilding(false);
    }
    buildTree();
  }, [filteredFamilies, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => [...eds, params]),
    [setEdges]
  );

  // ✅ Sincronizar seleção externa (Fase 4)
  useEffect(() => {
    if (selectedFamilyKey && selectedFamilyKey !== selectedFamily?.guardianId.replace('guardian-', '')) {
      selectFamily(`guardian-${selectedFamilyKey}`);
    } else if (!selectedFamilyKey && selectedFamily) {
      resetSelection();
    }
  }, [selectedFamilyKey, selectedFamily, selectFamily, resetSelection]);

  // ✅ Handler de click em nó (Fase 3 + 4)
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    let familyKey: string | null = null;
    
    // Se for um nó de responsável, selecionar essa família
    if (node.type === 'guardianNode') {
      selectFamily(node.id);
      familyKey = node.id.replace('guardian-', '');
    }
    // Se for um nó de aluno, selecionar a família do responsável
    else if (node.type === 'studentNode') {
      // Encontrar o responsável deste aluno
      const guardianEdge = edges.find(edge => 
        edge.target === node.id && edge.source.startsWith('guardian-')
      );
      if (guardianEdge) {
        selectFamily(guardianEdge.source);
        familyKey = guardianEdge.source.replace('guardian-', '');
      }
    }

    // Notificar componente pai sobre seleção (Fase 4)
    if (familyKey && onFamilySelect) {
      onFamilySelect(familyKey);
    }
  }, [selectFamily, edges, onFamilySelect]);

  // Handler para editar aluno
  const handleEditStudent = useCallback(async (studentId: string) => {
    setLoadingStudent(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;

      const { data: guardiansData } = await supabase
        .from('guardians')
        .select('*')
        .eq('student_id', studentId)
        .order('is_primary', { ascending: false });

      const { data: classesData } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', studentId);

      const studentData: any = {
        id: profileData.id,
        name: profileData.name,
        email: profileData.email,
        avatar: profileData.avatar,
        dob: profileData.dob,
        enrollmentNumber: profileData.enrollment_number,
        phone: profileData.phone,
        isActive: profileData.is_active,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
        guardians: guardiansData || [],
        classes: classesData?.map(c => ({ id: c.class_id, name: '' })) || [],
        notes: profileData.student_notes,
      };

      setSelectedStudentForEdit(studentData);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
      toast.error('Erro ao carregar dados do aluno');
    } finally {
      setLoadingStudent(false);
    }
  }, []);

  // Handler após salvar o aluno editado
  const handleSaveStudent = useCallback(async () => {
    await fetchStudents();
    setIsEditModalOpen(false);
    setSelectedStudentForEdit(null);
    toast.success('Aluno atualizado com sucesso!');
  }, [fetchStudents]);

  if (isBuilding) {
    return (
      <div className="space-y-4">
        <FamilyTreeFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalFamilies={totalFamilies}
          filteredCount={filteredCount}
        />
        <div className="h-[800px] flex items-center justify-center rounded-xl border border-border bg-gradient-to-br from-background to-muted">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando relacionamentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb de Navegação (Fase 4) */}
      <FamilyBreadcrumb
        guardianName={selectedFamily?.guardianName}
        studentCount={selectedFamily?.students.length}
        onReset={() => {
          resetSelection();
          if (onFamilySelect) onFamilySelect(null);
        }}
      />

      {/* Painel de Filtros */}
      <FamilyTreeFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalFamilies={totalFamilies}
        filteredCount={filteredCount}
      />
      
      {/* Árvore + Sidebar */}
      <div 
        ref={reactFlowWrapperRef}
        className="h-[800px] w-full rounded-xl border border-border overflow-hidden bg-gradient-to-br from-background to-muted relative"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="family-tree-flow"
        >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="hsl(var(--muted-foreground) / 0.1)"
        />
        
        <Controls 
          className="!bg-background/90 !border-border backdrop-blur-sm"
          showInteractive={false}
        />
        
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'guardianNode') return 'hsl(var(--chart-1))';
            return 'hsl(var(--chart-2))';
          }}
          className="!bg-background/90 !border-border backdrop-blur-sm"
          maskColor="rgba(0,0,0,0.2)"
        />
        
        {/* ✅ Botão de exportação (Fase 4.3) */}
        <Panel position="top-left">
          <ExportTreeButton
            onExportPNG={exportToPNG}
            onExportPDF={exportToPDF}
            isExporting={isExporting}
          />
        </Panel>
        
        {/* ✅ Legenda retrátil (Fase 4.2) */}
        <Panel position="top-right" className="!bg-background/90 backdrop-blur-sm rounded-lg border border-border">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">Legenda</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className="h-6 w-6"
                title={isLegendOpen ? "Recolher legenda" : "Expandir legenda"}
              >
                {isLegendOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {isLegendOpen && (
              <div className="text-sm space-y-2 max-h-[600px] overflow-y-auto animate-in fade-in duration-300">
                {/* Nodes */}
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: 'hsl(var(--chart-1))' }}></div>
                  <span className="text-xs">Responsável</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: 'hsl(var(--chart-2))' }}></div>
                  <span className="text-xs">Aluno</span>
                </div>
                
                <hr className="border-border my-2" />
                
                {/* Edges */}
                <p className="text-xs font-semibold text-muted-foreground mb-1">Relações:</p>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 rounded" style={{ background: 'hsl(var(--chart-1))' }}></div>
                  <span className="text-xs">Responsável</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 border-t-2 border-dashed rounded" style={{ borderColor: 'hsl(var(--chart-2))' }}></div>
                  <span className="text-xs">Irmãos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 border-t-2 border-dashed rounded" style={{ borderColor: 'hsl(var(--chart-3))' }}></div>
                  <span className="text-xs">Primos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 border-t-2 border-dotted rounded" style={{ borderColor: 'hsl(var(--chart-4))' }}></div>
                  <span className="text-xs">Tio-Sobrinho</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 border-t-2 border-dashed rounded" style={{ borderColor: 'hsl(var(--chart-5))' }}></div>
                  <span className="text-xs">Padrinho-Afilhado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 border-t border-dashed rounded" style={{ borderColor: 'hsl(var(--muted-foreground))' }}></div>
                  <span className="text-xs">Outro</span>
                </div>
              </div>
            )}
          </div>
        </Panel>
        </ReactFlow>

        {/* ✅ Sidebar de detalhes da família (Fase 3) */}
        <FamilyDetailsSidebar
          selectedFamily={selectedFamily}
          onClose={() => {
            resetSelection();
            if (onFamilySelect) onFamilySelect(null);
          }}
          onNext={selectNextFamily}
          onPrevious={selectPreviousFamily}
          totalFamilies={filteredCount}
          onEditStudent={handleEditStudent}
        />

        {/* Modal de edição de aluno */}
        {isEditModalOpen && selectedStudentForEdit && (
          <StudentFormSteps
            open={isEditModalOpen}
            onOpenChange={(open) => {
              setIsEditModalOpen(open);
              if (!open) setSelectedStudentForEdit(null);
            }}
            student={selectedStudentForEdit}
            onSave={handleSaveStudent}
          />
        )}
      </div>
    </div>
  );
}

// ✅ Wrapper com ReactFlowProvider para funcionar corretamente (Fase 4: passa props)
export function FamilyTreeVisualization({ 
  families,
  searchTerm,
  selectedFamilyKey,
  onFamilySelect,
}: FamilyTreeVisualizationProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeVisualizationInner 
        families={families}
        searchTerm={searchTerm}
        selectedFamilyKey={selectedFamilyKey}
        onFamilySelect={onFamilySelect}
      />
    </ReactFlowProvider>
  );
}
