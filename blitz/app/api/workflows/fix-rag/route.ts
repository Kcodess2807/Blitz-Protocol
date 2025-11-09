import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { listWorkflowsForBusiness } from '@/app/lib/db/workflows';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const { business } = await ensureBusinessForUser(user);

    const workflows = await listWorkflowsForBusiness(business.id);
    if (workflows.length === 0) {
      return NextResponse.json({ error: 'No workflow found' }, { status: 404 });
    }

    const workflow = workflows[0];
    const supabase = getSupabaseAdmin();

    // Get current workflow
    const { data: workflowData, error: fetchError } = await supabase
      .from('workflows')
      .select('react_flow_state')
      .eq('id', workflow.id)
      .single();

    if (fetchError || !workflowData) {
      return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
    }

    const reactFlowState = workflowData.react_flow_state as any;
    let nodes = reactFlowState?.nodes || [];
    const edges = reactFlowState?.edges || [];

    // Check if RAG module exists
    const ragNode = nodes.find((n: any) => n.type === 'module' && n.data?.moduleType === 'rag');

    if (ragNode) {
      return NextResponse.json({
        success: true,
        message: 'RAG module already exists',
        ragNode: {
          id: ragNode.id,
          type: ragNode.type,
          moduleType: ragNode.data?.moduleType,
        },
        totalNodes: nodes.length,
      });
    }

    // Add RAG module if it doesn't exist
    const newRAGNode = {
      id: 'module-rag',
      type: 'module',
      position: { x: 400, y: 100 },
      data: {
        moduleType: 'rag',
        label: 'company policy',
      },
      deletable: true,
    };

    nodes.push(newRAGNode);

    // Also add edge from GenAI to RAG
    const genAINode = nodes.find((n: any) => n.type === 'genai-intent');
    if (genAINode) {
      const newEdge = {
        id: `${genAINode.id}-module-rag-${Date.now()}`,
        source: genAINode.id,
        target: 'module-rag',
        markerEnd: { type: 'arrowclosed', width: 16, height: 16 },
      };
      edges.push(newEdge);
    }

    // Update workflow
    const { error: updateError } = await supabase
      .from('workflows')
      .update({
        react_flow_state: {
          nodes,
          edges,
        },
      })
      .eq('id', workflow.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'RAG module added to workflow',
      ragNode: newRAGNode,
      totalNodes: nodes.length,
      totalEdges: edges.length,
    });

  } catch (error) {
    console.error('[Fix RAG API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
