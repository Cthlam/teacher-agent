export type NodeType =
  | "root"
  | "concept"
  | "example"
  | "definition"
  | "summary"
  | "deep_dive"
  | "quiz";

export interface KnowledgeNode {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  nodeType: NodeType;
  posX: number;
  posY: number;
  posZ: number;
  isRoot: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEdge {
  id: string;
  classroomId: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  createdAt: string;
}

export interface Classroom {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface ChatMessage {
  id: string;
  classroomId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  classroomId: string;
  nodeId?: string | null;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
}

// Graph visualization types
export interface GraphNode {
  id: string;
  title: string;
  nodeType: NodeType;
  content: string;
  isRoot: boolean;
  x?: number;
  y?: number;
  z?: number;
  // react-force-graph adds these
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Agent response types
export interface AgentResponse {
  message: string;
  graphUpdates: {
    createdNodes: KnowledgeNode[];
    updatedNodes: KnowledgeNode[];
    createdEdges: KnowledgeEdge[];
    generatedQuiz?: Quiz;
  };
}

export interface AgentRequest {
  classroomId: string;
  message: string;
  activeNodeId?: string | null;
  mode?: AgentMode;
}

export type AgentMode = "local" | "premium";
