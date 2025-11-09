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

    // Get the workflow
    const workflows = await listWorkflowsForBusiness(business.id);
    if (workflows.length === 0) {
      return NextResponse.json({ error: 'No workflow found' }, { status: 404 });
    }

    const workflow = workflows[0];
    const supabase = getSupabaseAdmin();

    // Get current workflow state
    const { data: workflowData, error: fetchError } = await supabase
      .from('workflows')
      .select('react_flow_state')
      .eq('id', workflow.id)
      .single();

    if (fetchError || !workflowData) {
      return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
    }

    const reactFlowState = workflowData.react_flow_state as any;
    const nodes = reactFlowState?.nodes || [];
    const edges = reactFlowState?.edges || [];

    // Find GenAI Intent node
    const genAINode = nodes.find((n: any) => n.type === 'genai-intent');
    
    // Find RAG module node
    const ragNode = nodes.find((n: any) => 
      n.type === 'module' && n.data?.moduleType === 'rag'
    );

    if (!genAINode) {
      return NextResponse.json({ error: 'GenAI Intent node not found' }, { status: 404 });
    }

    if (!ragNode) {
      return NextResponse.json({ error: 'RAG module not found' }, { status: 404 });
    }

    // Check if edge already exists
    const edgeExists = edges.some((e: any) => 
      e.source === genAINode.id && e.target === ragNode.id
    );

    if (edgeExists) {
      return NextResponse.json({ 
        message: 'Edge already exists',
        edge: edges.find((e: any) => e.source === genAINode.id && e.target === ragNode.id)
      });
    }

    // Create new edge
    const newEdge = {
      id: `${genAINode.id}-${ragNode.id}-${Date.now()}`,
      source: genAINode.id,
      target: ragNode.id,
      sourceHandle: null,
      targetHandle: null,
      type: 'default',
      animated: false,
      markerEnd: { type: 'arrowclosed', width: 16, height: 16 },
    };

    // Add edge to workflow
    const updatedEdges = [...edges, newEdge];

    // Update workflow
    const { error: updateError } = await supabase
      .from('workflows')
      .update({
        react_flow_state: {
          nodes,
          edges: updatedEdges,
        },
      })
      .eq('id', workflow.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Edge added successfully',
      edge: newEdge,
      totalEdges: updatedEdges.length,
    });

  } catch (error) {
    console.error('[Add Edge API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
