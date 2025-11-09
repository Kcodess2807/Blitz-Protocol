import { listWorkflowsForBusiness, loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';
import { WorkflowNodeWithConfig } from '@/app/lib/types/workflow';
import { WorkflowRecord } from '@/app/lib/db/workflows';
import { testAPIKey } from './api-key-validator';

export interface WorkflowGenAINode {
  workflow: WorkflowRecord;
  genAINode: WorkflowNodeWithConfig | null;
  nodes: WorkflowNodeWithConfig[];
  edges: Array<{ id: string; source: string; target: string }>;
}

/**
 * Loads the business's workflow and extracts the GenAI node with its configuration
 */
export async function getWorkflowGenAINode(businessId: string): Promise<WorkflowGenAINode> {
  const workflows = await listWorkflowsForBusiness(businessId);

  if (workflows.length === 0) {
    throw new Error('No workflow found for this business. Please create a workflow first.');
  }

  // Get the primary workflow (first one)
  const workflow = workflows[0];

  // Load workflow with configurations
  const { nodes, edges } = await loadWorkflowWithConfigurations(workflow.id);

  // Log for debugging
  console.log('[workflow-loader] Loaded workflow:', {
    workflowId: workflow.id,
    nodesCount: nodes.length,
    edgesCount: edges.length,
    nodes: nodes.map(n => ({ id: n.id, type: n.type, moduleType: n.data?.moduleType })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
  });

  // Find the GenAI node
  const genAINode = nodes.find((node) => node.type === 'genai-intent') || null;

  if (!genAINode) {
    throw new Error('GenAI Intent node not found in workflow. Please add and configure a GenAI Intent node.');
  }

  // Check if GenAI node is configured
  if (!genAINode.isConfigured) {
    throw new Error('GenAI Intent node is not configured. Please configure the node in the workflow builder with an API key.');
  }

  // Validate GenAI config has API key
  if (!genAINode.genAIConfig?.apiKey) {
    throw new Error('GenAI Intent node API key is missing. Please configure your API key (Perplexity or Google Gemini) in the GenAI node settings.');
  }
  
  // Validate GenAI config has model
  if (!genAINode.genAIConfig?.model) {
    throw new Error('GenAI Intent node model is missing. Please select a model in the GenAI node settings.');
  }

  // Validate supported models
  const supportedModels = ['sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  if (!supportedModels.includes(genAINode.genAIConfig.model)) {
    throw new Error(`Unsupported model: "${genAINode.genAIConfig.model}". Supported models are: ${supportedModels.join(', ')}. Please update your GenAI node configuration.`);
  }

  // Test the API key to ensure it actually works
  try {
    const apiKeyTest = await testAPIKey(genAINode.genAIConfig);
    if (!apiKeyTest.valid) {
      // API key is invalid - mark node as not configured in database
      const { saveNodeConfiguration, loadNodeConfigurations } = await import('@/app/lib/db/node-configurations');
      const configurations = await loadNodeConfigurations(workflow.id);
      const nodeConfig = configurations[genAINode.id];
      
      if (nodeConfig) {
        await saveNodeConfiguration(
          workflow.id,
          genAINode.id,
          'genai-intent',
          nodeConfig,
          false
        );
      }
      
      throw new Error(apiKeyTest.error || 'API key is invalid or not working. Please update your API key in the workflow builder.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    throw new Error(`Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Ensure edges array is properly formatted
  const formattedEdges = edges.map(edge => ({
    id: edge.id || `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
  }));

  return {
    workflow,
    genAINode,
    nodes,
    edges: formattedEdges,
  };
}

/**
 * Lists all businesses with their workflows
 */
export async function listBusinessesWithWorkflows(): Promise<Array<{
  id: string;
  name: string;
  workflowId: string | null;
  hasWorkflow: boolean;
  hasGenAINode: boolean;
}>> {
  return [];
}