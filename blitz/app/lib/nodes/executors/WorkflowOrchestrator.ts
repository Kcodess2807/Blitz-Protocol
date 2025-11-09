import { GenAINodeExecutor } from './GenAINodeExecutor';
import { RAGNodeExecutor } from './RAGNodeExecutor';
import { TrackingModuleExecutor } from './TrackingModuleExecutor';
import { CancellationModuleExecutor } from './CancellationModuleExecutor';
import { FAQModuleExecutor } from './FAQModuleExecutor';
import { RefundModuleExecutor } from './RefundModuleExecutor';
import { ExecutionContext, GenAIExecutionResult } from '../types/execution';
import { WorkflowNodeWithConfig } from '@/app/lib/types/workflow';

export interface WorkflowExecutionResult extends GenAIExecutionResult {
  ragContext?: {
    hasContext: boolean;
    confidence: number;
    sources: Array<{
      category?: string;
      similarity: number;
    }>;
  };
  data?: Record<string, unknown>;
}

export class WorkflowOrchestrator {
  /**
   * Executes a workflow starting from the GenAI node
   * Checks for connected RAG modules and executes them first if present
   */
  static async executeWorkflow(
    message: string,
    genAINode: WorkflowNodeWithConfig,
    allNodes: WorkflowNodeWithConfig[],
    edges: Array<{ source: string; target: string }> | undefined | null,
    context: ExecutionContext
  ): Promise<WorkflowExecutionResult> {
    console.log('[WorkflowOrchestrator] Starting workflow execution');
    
    // Ensure edges is always an array
    const validEdges = edges || [];

    // Step 1: Check if GenAI node is connected to a RAG module
    // SMART FALLBACK: If no edges, find ANY configured RAG module
    let connectedRAGNode = this.findConnectedRAGModule(genAINode.id, allNodes, validEdges);
    
    // Fallback: If no connection found via edges, look for any configured RAG module
    if (!connectedRAGNode) {
      console.log('[WorkflowOrchestrator] No edge connection found, searching for any RAG module...');
      connectedRAGNode = allNodes.find(node => 
        node.type === 'module' && 
        node.data?.moduleType === 'rag' && 
        node.isConfigured
      ) || null;
      
      if (connectedRAGNode) {
        console.log('[WorkflowOrchestrator] Found RAG module via fallback:', connectedRAGNode.id);
      }
    }

    console.log('[WorkflowOrchestrator] Connection check:', {
      genAINodeId: genAINode.id,
      totalNodes: allNodes.length,
      totalEdges: validEdges.length,
      edges: validEdges,
      allNodeTypes: allNodes.map(n => ({ id: n.id, type: n.type, moduleType: n.data?.moduleType, isConfigured: n.isConfigured })),
      foundRAGNode: !!connectedRAGNode,
      ragNodeId: connectedRAGNode?.id,
      usedFallback: validEdges.length === 0,
    });

    let ragContext: WorkflowExecutionResult['ragContext'];
    let ragAnswer: string | undefined;

    // Step 2: If RAG module is connected, execute it first
    if (connectedRAGNode) {
      console.log('[WorkflowOrchestrator] Found connected RAG module:', {
        nodeId: connectedRAGNode.id,
        hasRagConfig: !!connectedRAGNode.ragConfig,
        ragConfig: connectedRAGNode.ragConfig,
      });

      if (!connectedRAGNode.ragConfig) {
        console.error('[WorkflowOrchestrator] RAG module has no ragConfig! Skipping RAG execution.');
      } else {
        try {
          // Execute RAG module to get context
          const ragNodeData = {
            ragConfig: connectedRAGNode.ragConfig,
          };

          const ragExecutor = new RAGNodeExecutor(ragNodeData);
          const ragResult = await ragExecutor.execute(message, context, connectedRAGNode.id);

          console.log('[WorkflowOrchestrator] RAG execution result:', {
            hasContext: ragResult.hasContext,
            confidence: ragResult.confidence,
            sourcesCount: ragResult.sources.length,
            answerLength: ragResult.answer?.length || 0,
          });

          // Store RAG context for response
          ragContext = {
            hasContext: ragResult.hasContext,
            confidence: ragResult.confidence,
            sources: ragResult.sources.map(s => ({
              category: s.category,
              similarity: s.similarity,
            })),
          };

          // If RAG found context, store it to pass to GenAI
          if (ragResult.hasContext && ragResult.answer) {
            ragAnswer = ragResult.answer;
            console.log('[WorkflowOrchestrator] RAG context retrieved:', {
              contextLength: ragAnswer.length,
              confidence: ragResult.confidence,
            });
          } else {
            console.log('[WorkflowOrchestrator] RAG found no context, GenAI will work without RAG');
          }
        } catch (error) {
          console.error('[WorkflowOrchestrator] RAG execution failed:', error);
          // Continue with GenAI execution even if RAG fails
          // Don't throw - just log the error
        }
      }
    } else {
      console.log('[WorkflowOrchestrator] No RAG module connected to GenAI node');
    }

    // Step 3: Execute GenAI node with RAG context if available
    const genAINodeData = {
      genAIConfig: genAINode.genAIConfig,
    };

    const genAIExecutor = new GenAINodeExecutor(genAINodeData);
    const genAIResult = await genAIExecutor.execute(message, context, ragAnswer);

    // Step 4: Check if we need to route to a specific module based on intent
    if (genAIResult.intent !== 'general_query') {
      const moduleResult = await this.executeModuleForIntent(
        genAIResult.intent,
        genAIResult.extractedData || {},
        allNodes,
        validEdges,
        context
      );

      if (moduleResult) {
        // Return module result instead of GenAI result
        return {
          ...genAIResult,
          response: moduleResult.response,
          method: moduleResult.method,
          data: moduleResult.data,
          ragContext,
        };
      }
    }

    // Step 5: Combine results
    const result: WorkflowExecutionResult = {
      ...genAIResult,
      ragContext,
    };

    console.log('[WorkflowOrchestrator] Workflow execution complete:', {
      intent: result.intent,
      method: result.method,
      hasRAGContext: !!ragContext,
    });

    return result;
  }

  /**
   * Executes the appropriate module based on detected intent
   */
  private static async executeModuleForIntent(
    intent: 'cancellation' | 'order_query' | 'refund_query' | 'service_enquiry',
    extractedData: Record<string, unknown>,
    allNodes: WorkflowNodeWithConfig[],
    edges: Array<{ source: string; target: string }>,
    context: ExecutionContext
  ): Promise<{ response: string; method: any; data?: any } | null> {
    console.log('[WorkflowOrchestrator] Executing module for intent:', intent);

    try {
      if (intent === 'order_query') {
        // Execute tracking module
        const executor = new TrackingModuleExecutor();
        const orderId = (extractedData.orderId as string) || 'ORD-12345';
        const result = await executor.execute(orderId, context);
        
        if (result.trackingInfo) {
          return {
            response: this.formatTrackingResponse(result.trackingInfo),
            method: result.method,
            data: result.trackingInfo,
          };
        } else {
          return {
            response: result.error || 'Order not found',
            method: result.method,
          };
        }
      }

      if (intent === 'cancellation') {
        // Execute cancellation module
        const executor = new CancellationModuleExecutor();
        const orderId = (extractedData.orderId as string) || 'ORD-11111';
        const reason = (extractedData.reason as string) || 'Customer request';
        const result = await executor.execute(orderId, reason, context);
        
        return {
          response: result.cancellationResult.message,
          method: result.method,
          data: result.cancellationResult,
        };
      }

      if (intent === 'refund_query') {
        // Execute refund module
        const executor = new RefundModuleExecutor();
        const orderId = (extractedData.orderId as string) || 'ORD-67890';
        const reason = (extractedData.reason as string) || 'Product defective';
        const result = await executor.execute(orderId, reason, context);
        
        return {
          response: result.refundResult.message,
          method: result.method,
          data: result.refundResult,
        };
      }

      if (intent === 'service_enquiry') {
        // Execute service enquiry module
        const { ServiceEnquiryModuleExecutor } = await import('./ServiceEnquiryModuleExecutor');
        const executor = new ServiceEnquiryModuleExecutor();
        const enquiryType = (extractedData.enquiryType as string) || 'general';
        const description = (extractedData.description as string) || 'Customer enquiry';
        const result = await executor.execute(enquiryType, description, context);
        
        return {
          response: result.enquiryResult.message,
          method: result.method,
          data: result.enquiryResult,
        };
      }

      return null;
    } catch (error) {
      console.error('[WorkflowOrchestrator] Module execution failed:', error);
      return null;
    }
  }

  /**
   * Formats tracking information into a readable response
   */
  private static formatTrackingResponse(trackingInfo: any): string {
    const { orderId, status, currentLocation, estimatedDelivery, trackingNumber, carrier, customerName, productName } = trackingInfo;
    
    return `📦 **Order Tracking - ${orderId}**

**Customer:** ${customerName}
**Product:** ${productName}

**Current Status:** ${status}
**Location:** ${currentLocation}
**Estimated Delivery:** ${estimatedDelivery}

**Tracking Details:**
• Tracking Number: ${trackingNumber}
• Carrier: ${carrier}

**Recent Updates:**
${trackingInfo.milestones.slice(-3).map((m: any) => `• ${m.date} ${m.time} - ${m.status} (${m.location})`).join('\n')}`;
  }

  /**
   * Finds a RAG module connected to the given node
   */
  private static findConnectedRAGModule(
    nodeId: string,
    allNodes: WorkflowNodeWithConfig[],
    edges: Array<{ source: string; target: string }> | undefined | null
  ): WorkflowNodeWithConfig | null {
    // Safety check: if no edges, return null
    if (!edges || edges.length === 0) {
      console.log('[WorkflowOrchestrator] No edges provided to findConnectedRAGModule');
      return null;
    }

    console.log('[WorkflowOrchestrator] Searching for RAG connection:', {
      searchingFromNode: nodeId,
      availableEdges: edges,
      availableNodes: allNodes.map(n => ({ id: n.id, type: n.type, moduleType: n.data?.moduleType })),
    });

    // Find edges where the source is the given node
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    console.log('[WorkflowOrchestrator] Found outgoing edges:', outgoingEdges);

    // Find RAG modules among the connected nodes
    for (const edge of outgoingEdges) {
      const targetNode = allNodes.find(node => node.id === edge.target);
      console.log('[WorkflowOrchestrator] Checking target node:', {
        edgeTarget: edge.target,
        foundNode: !!targetNode,
        nodeType: targetNode?.type,
        moduleType: targetNode?.data?.moduleType,
      });
      
      if (targetNode && targetNode.type === 'module' && targetNode.data?.moduleType === 'rag') {
        console.log('[WorkflowOrchestrator] Found RAG module via edge!', targetNode.id);
        return targetNode;
      }
    }

    console.log('[WorkflowOrchestrator] No RAG module found via edges');
    return null;
  }
}