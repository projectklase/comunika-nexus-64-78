import { Node, Edge } from 'reactflow';

export interface FamilyNodeData {
  id: string;
  name: string;
  avatar?: string;
  isGuardian: boolean;
  guardianName?: string;
  email?: string;
  phone?: string;
  studentCount?: number;
}

export type FamilyNode = Node<FamilyNodeData>;

export interface FamilyEdgeData {
  relationshipType?: string;
  relationshipLabel?: string;
}

export type FamilyEdge = Edge<FamilyEdgeData>;

export interface FamilyTreeData {
  nodes: FamilyNode[];
  edges: FamilyEdge[];
}
