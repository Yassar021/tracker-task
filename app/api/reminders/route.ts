import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth-utils';
import { sendAssignmentReminder, sendAllAssignmentReminders } from '@/lib/whatsapp-service';

// POST handler to send reminder for a specific assignment
export async function POST(request: NextRequest) {
  try {
    // Only admin can trigger reminders
    await requireAuth('admin');
    
    const body = await request.json();
    const { assignmentId } = body;
    
    if (!assignmentId) {
      return Response.json({ message: 'Assignment ID is required' }, { status: 400 });
    }
    
    const result = await sendAssignmentReminder(assignmentId);
    
    if (result.success) {
      return Response.json({ 
        message: 'Reminder sent successfully', 
        messageSid: result.messageSid 
      });
    } else {
      return Response.json({ message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// GET handler to send reminders for all ungraded assignments
export async function GET() {
  try {
    // Only admin can trigger reminders
    await requireAuth('admin');
    
    const results = await sendAllAssignmentReminders();
    
    return Response.json({ 
      message: 'Reminders sent', 
      results 
    });
  } catch (error) {
    console.error('Error sending all reminders:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}