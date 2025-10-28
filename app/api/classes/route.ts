import { NextRequest } from 'next/server';
import { db } from '@/db';
import { classes, users } from '@/db/schema/tasks';
import { eq, and } from 'drizzle-orm';
import { requireAuth, hasRole } from '@/lib/server-auth-utils';
import { v4 as uuidv4 } from 'uuid';
import { logClassCreation } from '@/lib/audit';

// GET handler for classes API
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Check if user is admin to see all classes or teacher to see only their classes
    const isAdmin = await hasRole('admin');
    
    let classesData;
    if (isAdmin) {
      // Admin can see all classes
      classesData = await db
        .select()
        .from(classes)
        .orderBy(classes.grade, classes.name);
    } else {
      // Teacher can see only their classes
      classesData = await db
        .select()
        .from(classes)
        .where(eq(classes.teacherId, session.id))
        .orderBy(classes.grade, classes.name);
    }
    
    return Response.json(classesData);
  } catch (error) {
    console.error('Error fetching classes:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for classes API
export async function POST(request: NextRequest) {
  try {
    // Only admin can create classes
    const session = await requireAuth('admin');
    
    const body = await request.json();
    const { grade, name, teacherId } = body;
    
    // Validate required fields
    if (!grade || !name) {
      return Response.json({ message: 'Missing required fields: grade and name' }, { status: 400 });
    }
    
    // Validate grade is between 7 and 9
    if (grade < 7 || grade > 9) {
      return Response.json({ message: 'Grade must be between 7 and 9' }, { status: 400 });
    }
    
    // Check if teacher exists if provided
    if (teacherId) {
      const [teacher] = await db
        .select()
        .from(users)
        .where(eq(users.id, teacherId));
      
      if (!teacher) {
        return Response.json({ message: 'Teacher not found' }, { status: 404 });
      }
    }
    
    // Check if class already exists
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(
        eq(classes.grade, grade),
        eq(classes.name, name)
      ));
    
    if (existingClass) {
      return Response.json({ message: 'Class already exists' }, { status: 409 });
    }
    
    // Create the class
    const newClassId = uuidv4();
    const [newClass] = await db
      .insert(classes)
      .values({
        id: newClassId,
        grade,
        name,
        teacherId: teacherId || null,
      })
      .returning();
    
    // Log the class creation
    await logClassCreation(session.id, newClassId, {
      grade,
      name,
      teacherId: teacherId || null,
    });
    
    return Response.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}