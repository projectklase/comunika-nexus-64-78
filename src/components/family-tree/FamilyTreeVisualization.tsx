import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GuardianNode } from './GuardianNode';
import { StudentNode } from './StudentNode';
import { buildFamilyTree } from '@/utils/family-tree-builder';
import { FamilyGroup } from '@/types/family-metrics';
import { useFamilyTreeFilters } from '@/hooks/useFamilyTreeFilters';
import { FamilyTreeFilters } from './FamilyTreeFilters';

interface FamilyTreeVisualizationProps {
  families: FamilyGroup[];
}

const nodeTypes = {
  guardianNode: GuardianNode,
  studentNode: StudentNode,
};

export function FamilyTreeVisualization({ families }: FamilyTreeVisualizationProps) {
  const {
    filters,
    setFilters,
    filteredFamilies,
    totalFamilies,
    filteredCount,
  } = useFamilyTreeFilters(families);

  const [isBuilding, setIsBuilding] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
      {/* Painel de Filtros */}
      <FamilyTreeFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalFamilies={totalFamilies}
        filteredCount={filteredCount}
      />
      
      {/* Árvore */}
      <div className="h-[800px] w-full rounded-xl border border-border overflow-hidden bg-gradient-to-br from-background to-muted">
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        
        <Panel position="top-right" className="!bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border max-h-[600px] overflow-y-auto">
          <div className="text-sm text-foreground space-y-2">
            <p className="font-semibold mb-2">Legenda:</p>
            
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
        </Panel>
      </ReactFlow>
      </div>
    </div>
  );
}
