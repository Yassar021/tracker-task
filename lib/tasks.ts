import { db } from "@/db";
import { assignments, classAssignments, classes, users, assignmentStatuses, settings } from "@/db/schema/tasks";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { startOfWeek, endOfWeek, getWeek, getYear } from "date-fns";
import { logAssignmentCreation, logGradeStatusUpdate } from "./audit";

// Function to get current week number and year
export const getCurrentWeekInfo = () => {
  const now = new Date();
  return {
    weekNumber: getWeek(now),
    year: getYear(now)
  };
};

// Helper function to validate assignment quotas
export const validateAssignmentQuota = async (classIds: string[], userId: string) => {
  const { weekNumber, year } = getCurrentWeekInfo();
  
  // Check if any of the classes already have 2 assignments for the current week
  for (const classId of classIds) {
    const assignmentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .innerJoin(classAssignments, eq(assignments.id, classAssignments.assignmentId))
      .where(
        and(
          eq(classAssignments.classId, classId),
          eq(assignments.weekNumber, weekNumber),
          eq(assignments.year, year),
          eq(assignments.teacherId, userId)
        )
      );
    
    const count = assignmentCount[0]?.count || 0;
    
    if (count >= 2) {
      // Find the class name for the error message
      const classRecord = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId));
      
      if (classRecord.length > 0) {
        throw new Error(`Kuota tugas untuk kelas ${classRecord[0].name} sudah mencapai batas maksimal 2 per minggu`);
      }
    }
  }
  
  return true;
};

// Function to get max assignment limit from settings (default to 2)
export const getMaxAssignmentLimit = async (): Promise<number> => {
  try {
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "max_assignments_per_class_per_week"));
    
    if (setting.length > 0) {
      return parseInt(setting[0].value, 10) || 2;
    }
    return 2; // default value
  } catch (error) {
    return 2; // default value if there's an error
  }
};

// Function to create a new assignment with proper validation
export const createAssignment = async (
  subject: string,
  learningGoal: string,
  type: "tugas" | "ujian_sumatif",
  classIds: string[],
  teacherId: string,
  assignedDate: Date = new Date()
) => {
  // Validate assignment quota for all selected classes
  const maxLimit = await getMaxAssignmentLimit();
  
  for (const classId of classIds) {
    const { weekNumber, year } = getCurrentWeekInfo();
    
    const assignmentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .innerJoin(classAssignments, eq(assignments.id, classAssignments.assignmentId))
      .where(
        and(
          eq(classAssignments.classId, classId),
          eq(assignments.weekNumber, weekNumber),
          eq(assignments.year, year),
          eq(assignments.teacherId, teacherId)
        )
      );
    
    const count = assignmentCount[0]?.count || 0;
    
    if (count >= maxLimit) {
      const classRecord = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId));
      
      if (classRecord.length > 0) {
        throw new Error(`Kuota tugas untuk kelas ${classRecord[0].name} sudah mencapai batas maksimal ${maxLimit} per minggu`);
      }
    }
  }
  
  // Create the assignment
  const assignmentId = uuidv4();
  const { weekNumber, year } = getCurrentWeekInfo();
  
  const [newAssignment] = await db
    .insert(assignments)
    .values({
      id: assignmentId,
      subject,
      learningGoal,
      type,
      weekNumber,
      year,
      assignedDate: assignedDate,
      teacherId,
    })
    .returning();
  
  // Create class assignments
  const classAssignmentValues = classIds.map(classId => ({
    classId,
    assignmentId: newAssignment.id,
  }));
  
  await db.insert(classAssignments).values(classAssignmentValues);
  
  // Initialize assignment status
  await db.insert(assignmentStatuses).values({
    assignmentId: newAssignment.id,
    isGraded: false,
  });
  
  // Log the assignment creation
  await logAssignmentCreation(teacherId, assignmentId, {
    subject,
    learningGoal,
    type,
    classIds,
    teacherId,
    assignedDate: assignedDate.toISOString(),
  });
  
  return newAssignment;
};

// Function to retrieve assignments with related class information
export const getAssignmentsWithClasses = async (userId?: string, classId?: string) => {
  let query = db
    .select({
      assignment: assignments,
      classAssignment: classAssignments,
      class: classes,
      status: assignmentStatuses,
      teacher: users,
    })
    .from(assignments)
    .innerJoin(classAssignments, eq(assignments.id, classAssignments.assignmentId))
    .innerJoin(classes, eq(classAssignments.classId, classes.id))
    .innerJoin(assignmentStatuses, eq(assignments.id, assignmentStatuses.assignmentId))
    .innerJoin(users, eq(assignments.teacherId, users.id));

  if (userId) {
    query = query.where(eq(assignments.teacherId, userId));
  }

  if (classId) {
    query = query.where(eq(classes.id, classId));
  }

  return await query;
};

// Function to get assignments for admin dashboard
export const getAdminAssignments = async () => {
  return await db
    .select({
      assignment: assignments,
      classAssignment: classAssignments,
      class: classes,
      status: assignmentStatuses,
      teacher: users,
    })
    .from(assignments)
    .innerJoin(classAssignments, eq(assignments.id, classAssignments.assignmentId))
    .innerJoin(classes, eq(classAssignments.classId, classes.id))
    .innerJoin(assignmentStatuses, eq(assignments.id, assignmentStatuses.assignmentId))
    .innerJoin(users, eq(assignments.teacherId, users.id));
};

// Function to get class quotas for teacher dashboard
export const getTeacherClassQuotas = async (userId: string) => {
  const { weekNumber, year } = getCurrentWeekInfo();
  const maxLimit = await getMaxAssignmentLimit();
  
  const allClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, userId));
  
  // Get assignment counts for each class in the current week
  const classQuotas = await Promise.all(allClasses.map(async (classRecord) => {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .innerJoin(classAssignments, eq(assignments.id, classAssignments.assignmentId))
      .where(
        and(
          eq(classAssignments.classId, classRecord.id),
          eq(assignments.weekNumber, weekNumber),
          eq(assignments.year, year),
          eq(assignments.teacherId, userId)
        )
      );
    
    const count = countResult[0]?.count || 0;
    return {
      class: classRecord,
      currentCount: count,
      remaining: maxLimit - count,
      quotaPercentage: (count / maxLimit) * 100,
    };
  }));
  
  return classQuotas;
};

// Function to update assignment grading status
export const updateAssignmentGradeStatus = async (assignmentId: string, isGraded: boolean, gradedByUserId: string) => {
  // Get the current status before updating for audit log
  const [currentStatus] = await db
    .select()
    .from(assignmentStatuses)
    .where(eq(assignmentStatuses.assignmentId, assignmentId));
  
  const result = await db
    .update(assignmentStatuses)
    .set({
      isGraded,
      gradedAt: isGraded ? new Date() : null,
      gradeInputBy: isGraded ? gradedByUserId : null,
    })
    .where(eq(assignmentStatuses.assignmentId, assignmentId));
  
  // Log the grade status update
  await logGradeStatusUpdate(
    gradedByUserId,
    assignmentId,
    currentStatus,
    {
      isGraded,
      gradedAt: isGraded ? new Date().toISOString() : null,
      gradeInputBy: isGraded ? gradedByUserId : null,
    }
  );
  
  return result;
};