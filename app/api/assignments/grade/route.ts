import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth-utils';
import { updateAssignmentGradeStatus } from '@/lib/tasks';

// PUT handler for updating assignment grade status
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const body = await request.json();
    const { assignmentId, isGraded } = body;
    
    // Validate required fields
    if (!assignmentId || isGraded === undefined) {
      return Response.json({ message: 'Missing required fields: assignmentId and isGraded' }, { status: 400 });
    }
    
    // Update the assignment grade status
    const result = await updateAssignmentGradeStatus(assignmentId, isGraded, session.id);
    
    return Response.json(result);
  } catch (error) {
    console.error('Error updating assignment grade status:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}