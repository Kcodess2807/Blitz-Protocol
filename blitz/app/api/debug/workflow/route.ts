import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get workflow and nodes
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const { business: userBusiness } = await ensureBusinessForUser(clerkUser);
    const targetBusinessId = businessId || userBusiness.id;

    const workflowGenAI = await getWorkflowGenAINode(targetBusinessId);
    const { workflow, genAINode, nodes, edges } = workflowGenAI;

    // Find RAG modules
    const ragModules = nodes.filter(
      (node) => node.type === 'module' && node.data.moduleType === 'rag'
    );

    // Check connections
    const ragToGenAIEdges = edges.filter(
      (edge) =>
        ragModules.some((rag) => rag.id === edge.source) &&
        edge.target === genAINode.id
    );

    // Detailed RAG info
    const ragDetails = ragModules.map((rag) => ({
      id: rag.id,
      isConfigured: rag.isConfigured,
      hasRagConfig: !!rag.ragConfig,
      ragConfig: rag.ragConfig,
      connectedToGenAI: ragToGenAIEdges.some((e) => e.source === rag.id),
    }));

    // Also check raw database state
    const supabase = (await import('@/app/lib/supabase/admin')).getSupabaseAdmin();
    const { data: rawWorkflow } = await supabase
      .from('workflows')
      .select('react_flow_state')
      .eq('id', workflow.id)
      .single();

    const rawState = rawWorkflow?.react_flow_state as any;

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        businessId: workflow.business_id,
      },
      genAINode: {
        id: genAINode.id,
        isConfigured: genAINode.isConfigured,
        hasGenAIConfig: !!genAINode.genAIConfig,
        model: genAINode.genAIConfig?.model,
      },
      ragModules: {
        count: ragModules.length,
        details: ragDetails,
      },
      edges: {
        total: edges.length,
        ragToGenAI: ragToGenAIEdges,
        allEdges: edges,
      },
      rawDatabaseState: {
        nodesCount: rawState?.nodes?.length || 0,
        edgesCount: rawState?.edges?.length || 0,
        nodes: rawState?.nodes?.map((n: any) => ({ id: n.id, type: n.type })) || [],
        edges: rawState?.edges || [],
      },
      diagnosis: {
        hasRAGModule: ragModules.length > 0,
        hasConfiguredRAG: ragDetails.some((r) => r.isConfigured),
        hasRAGConnection: ragToGenAIEdges.length > 0,
        readyForRAG:
          ragModules.length > 0 &&
          ragDetails.some((r) => r.isConfigured) &&
          ragToGenAIEdges.length > 0,
        databaseHasEdges: (rawState?.edges?.length || 0) > 0,
      },
    });
  } catch (error) {
    console.error('[Debug Workflow] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
