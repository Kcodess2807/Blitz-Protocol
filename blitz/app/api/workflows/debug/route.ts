import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const { business } = await ensureBusinessForUser(user);

    // Load workflow
    const workflowData = await getWorkflowGenAINode(business.id);

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflowData.workflow.id,
        name: workflowData.workflow.name,
      },
      genAINode: {
        id: workflowData.genAINode?.id,
        type: workflowData.genAINode?.type,
        isConfigured: workflowData.genAINode?.isConfigured,
      },
      nodes: workflowData.nodes.map(n => ({
        id: n.id,
        type: n.type,
        moduleType: n.data?.moduleType,
        isConfigured: n.isConfigured,
      })),
      edges: workflowData.edges || [],
      edgesCount: workflowData.edges?.length || 0,
    });

  } catch (error) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
