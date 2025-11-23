import { useCallback, useMemo } from 'react';
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

interface FamilyTreeVisualizationProps {
  families: FamilyGroup[];
}

const nodeTypes = {
  guardianNode: GuardianNode,
  studentNode: StudentNode,
};

export function FamilyTreeVisualization({ families }: FamilyTreeVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFamilyTree(families),
    [families]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => [...eds, params]),
    [setEdges]
  );

  return (
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
        
        <Panel position="top-right" className="!bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border">
          <div className="text-sm text-foreground space-y-2">
            <p className="font-semibold mb-2">Legenda:</p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: 'hsl(var(--chart-1))' }}></div>
              <span className="text-xs">Responsável</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: 'hsl(var(--chart-2))' }}></div>
              <span className="text-xs">Aluno</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 border-2 rounded" style={{ borderColor: 'hsl(var(--chart-1))' }}></div>
              <span className="text-xs">Responsabilidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 border-2 rounded border-dashed" style={{ borderColor: 'hsl(var(--chart-2))' }}></div>
              <span className="text-xs">Parentesco</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
