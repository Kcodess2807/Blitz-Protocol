// Type definitions for workflow nodes and edges

export type NodeType = 
  | 'genai-intent' 
  | 'router' 
  | 'module' 
  | 'response'
  | 'rag';

export type ModuleType = 
  | 'tracking' 
  | 'cancellation' 
  | 'faq' 
  | 'refund'
  | 'rag';

export type IntentType = 
  | 'TRACK_SHIPMENT' 
  | 'CANCEL_ORDER' 
  | 'FAQ_SUPPORT';

export interface APIConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface ModuleConfig {
  moduleType: ModuleType;
  apiConfigs: Record<string, APIConfig>;
  parameters?: Record<string, unknown>;
}

export interface GenAIConfig {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
  apiKey?: string; // Perplexity API key for this business
}

export interface RAGConfig {
  // Document management
  documentMode?: 'existing' | 'upload' | 'paste'; // How to provide content
  documentContent?: string; // Pasted text content
  uploadedFiles?: Array<{ name: string; content: string; type: string }>; // Uploaded files
  
  // Retrieval settings
  category?: string; // Filter by category (e.g., 'cancellation-policy', 'shipping-policy')
  matchThreshold?: number; // Similarity threshold (0-1)
  matchCount?: number; // Number of results to retrieve
  responseMode: 'concise' | 'detailed' | 'raw'; // How to format the response
  fallbackMessage?: string; // Message when no context found
}

export interface RouterConfig {
  intentMappings: Record<IntentType, string>; // Maps intent to module node ID
  defaultModule?: string;
}

// NodeData for react_flow_state - only basic info, no configurations
export interface NodeData extends Record<string, unknown> {
  // Basic info only - no sensitive config data
  label?: string;
  description?: string;
  moduleType?: ModuleType; // For module nodes, to identify which module type
  // Note: All configurations (genAIConfig, routerConfig, moduleConfig, etc.) 
  // are stored separately in node_configurations table
}

// Full node data including configurations (used when loading from DB)
export interface WorkflowNodeWithConfig {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  // Configurations loaded from node_configurations table
  genAIConfig?: GenAIConfig;
  routerConfig?: RouterConfig;
  moduleConfig?: ModuleConfig;
  ragConfig?: RAGConfig;
  responseConfig?: {
    responseType?: 'text' | 'structured' | 'ui-component';
    config?: Record<string, unknown>;
  };
  isConfigured?: boolean;
}

// WorkflowNode for react_flow_state (basic info only)
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
}

