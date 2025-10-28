import { NextRequest } from 'next/server';
import { db } from '@/db';
import { assignments, classes, users } from '@/db/schema/tasks';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/server-auth-utils';
import { createAssignment, getAssignmentsWithClasses, getTeacherClassQuotas } from '@/lib/tasks';

// GET handler for assignments API
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const classId = searchParams.get('classId');
    
    if (type === 'class-quotas') {
      // Get class quotas for the current teacher
      const classQuotas = await getTeacherClassQuotas(session.id);
      return Response.json(classQuotas);
    }
    
    // Get assignments for the current user
    const assignmentsData = await getAssignmentsWithClasses(session.id, classId || undefined);
    return Response.json(assignmentsData);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for assignments API
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const body = await request.json();
    const { subject, learningGoal, type, classIds, assignedDate } = body;
    
    // Validate required fields
    if (!subject || !learningGoal || !type || !classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return Response.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate assignment type
    if (!['tugas', 'ujian_sumatif'].includes(type)) {
      return Response.json({ message: 'Invalid assignment type' }, { status: 400 });
    }
    
    // Create the assignment
    const newAssignment = await createAssignment(
      subject,
      learningGoal,
      type as 'tugas' | 'ujian_sumatif',
      classIds,
      session.id,
      assignedDate ? new Date(assignedDate) : new Date()
    );
    
    return Response.json(newAssignment, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}