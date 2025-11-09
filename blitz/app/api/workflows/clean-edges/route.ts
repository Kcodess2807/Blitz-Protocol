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

    console.log('[Clean Edges] Current edges:', edges.length);
    console.log('[Clean Edges] Edges:', edges.map((e: any) => ({ id: e.id, source: e.source, target: e.target })));

    // Remove invalid edges (response-node as source)
    const validEdges = edges.filter((edge: any) => {
      // Remove edges where response node is the source
      if (edge.source === 'response-node') {
        console.log('[Clean Edges] Removing invalid edge:', edge.id);
        return false;
      }
      // Remove edges with invalid handle IDs
      if (edge.sourceHandle === 'response-input') {
        console.log('[Clean Edges] Removing edge with invalid handle:', edge.id);
        return false;
      }
      return true;
    });

    console.log('[Clean Edges] Valid edges after cleanup:', validEdges.length);

    // Update workflow
    const { error: updateError } = await supabase
      .from('workflows')
      .update({
        react_flow_state: {
          nodes,
          edges: validEdges,
        },
      })
      .eq('id', workflow.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invalid edges removed',
      removedCount: edges.length - validEdges.length,
      remainingEdges: validEdges.length,
      edges: validEdges.map((e: any) => ({ id: e.id, source: e.source, target: e.target })),
    });

  } catch (error) {
    console.error('[Clean Edges API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
