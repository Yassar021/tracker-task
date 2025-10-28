import { db } from '@/db';
import { auditLogs } from '@/db/schema/tasks';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// Define possible actions that can be audited
type AuditAction = 
  | 'create_assignment'
  | 'update_assignment'
  | 'delete_assignment'
  | 'create_class'
  | 'update_class'
  | 'delete_class'
  | 'update_settings'
  | 'send_reminder'
  | 'update_grade_status'
  | 'user_login'
  | 'user_logout'
  | 'user_registration';

// Function to create an audit log entry
export const createAuditLog = async (
  userId: string | null,
  action: AuditAction,
  tableName: string | null = null,
  recordId: string | null = null,
  oldValue: any = null,
  newValue: any = null
) => {
  try {
    const logId = uuidv4();
    
    await db.insert(auditLogs).values({
      id: logId,
      userId: userId || null,
      action,
      tableName: tableName || null,
      recordId: recordId || null,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      createdAt: new Date(),
    });

    return logId;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error as audit logging shouldn't break the main functionality
  }
};

// Function to get audit logs (for admin dashboard)
export const getAuditLogs = async (
  limit: number = 50,
  offset: number = 0,
  userId?: string,
  action?: AuditAction
) => {
  try {
    let query = db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.createdAt.desc())
      .limit(limit)
      .offset(offset);

    if (userId) {
      query = query.where(eq(auditLogs.userId, userId));
    }

    if (action) {
      query = query.where(eq(auditLogs.action, action));
    }

    return await query;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

// Helper functions for specific audit events
export const logAssignmentCreation = async (userId: string, assignmentId: string, assignmentData: any) => {
  await createAuditLog(
    userId,
    'create_assignment',
    'assignments',
    assignmentId,
    null,
    assignmentData
  );
};

export const logAssignmentUpdate = async (userId: string, assignmentId: string, oldValue: any, newValue: any) => {
  await createAuditLog(
    userId,
    'update_assignment',
    'assignments',
    assignmentId,
    oldValue,
    newValue
  );
};

export const logClassCreation = async (userId: string, classId: string, classData: any) => {
  await createAuditLog(
    userId,
    'create_class',
    'classes',
    classId,
    null,
    classData
  );
};

export const logSettingsUpdate = async (userId: string, key: string, oldValue: any, newValue: any) => {
  await createAuditLog(
    userId,
    'update_settings',
    'settings',
    key,
    oldValue,
    newValue
  );
};

export const logReminderSent = async (userId: string, assignmentId: string) => {
  await createAuditLog(
    userId,
    'send_reminder',
    'reminder_logs',
    assignmentId,
    null,
    null
  );
};

export const logGradeStatusUpdate = async (userId: string, assignmentId: string, oldValue: any, newValue: any) => {
  await createAuditLog(
    userId,
    'update_grade_status',
    'assignment_statuses',
    assignmentId,
    oldValue,
    newValue
  );
};