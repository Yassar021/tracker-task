import twilio from 'twilio';
import { db } from '@/db';
import { assignments, users, reminderLogs } from '@/db/schema/tasks';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+1234567890'

if (!accountSid || !authToken || !fromWhatsAppNumber) {
  console.warn('Twilio credentials not configured. WhatsApp notifications will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Function to send reminder message via WhatsApp
export const sendAssignmentReminder = async (assignmentId: string) => {
  if (!client) {
    console.error('Twilio client not initialized. Check environment variables.');
    return { success: false, message: 'Twilio not configured' };
  }

  try {
    // Fetch assignment and teacher information
    const [assignmentWithTeacher] = await db
      .select({
        assignment: assignments,
        teacher: users,
      })
      .from(assignments)
      .innerJoin(users, eq(assignments.teacherId, users.id))
      .where(eq(assignments.id, assignmentId));

    if (!assignmentWithTeacher) {
      throw new Error('Assignment not found');
    }

    const { assignment, teacher } = assignmentWithTeacher;

    if (!teacher.phoneNumber) {
      throw new Error(`Teacher ${teacher.name} does not have a phone number registered`);
    }

    // Check if a reminder was already sent for this assignment to this teacher
    const [existingLog] = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.assignmentId, assignmentId),
          eq(reminderLogs.teacherId, teacher.id)
        )
      );

    if (existingLog) {
      throw new Error('Reminder already sent for this assignment to this teacher');
    }

    // Format the WhatsApp number (assuming Indonesian number format)
    // In a real application, you might want to validate and format phone numbers properly
    let formattedPhone = teacher.phoneNumber;
    if (teacher.phoneNumber.startsWith('0')) {
      formattedPhone = '+62' + teacher.phoneNumber.substring(1);
    } else if (teacher.phoneNumber.startsWith('62')) {
      formattedPhone = '+' + teacher.phoneNumber;
    } else if (!teacher.phoneNumber.startsWith('+')) {
      formattedPhone = '+' + teacher.phoneNumber;
    }
    
    const toWhatsAppNumber = `whatsapp:${formattedPhone}`;

    // Create the message template
    const messageText = `Yth. Bapak/Ibu ${teacher.name},

*REMINDER PENILAIAN TUGAS*
SMP YPS SINGKOLE

📚 *Tugas/Ujian*: ${assignment.subject}
🎯 *Tujuan Pembelajaran*: ${assignment.learningGoal}
📅 *Tanggal Dibuat*: ${new Date(assignment.assignedDate).toLocaleDateString('id-ID')}

Tugas ini sudah melewati batas pengumpulan dan belum dinilai.

Mohon segera melakukan penilaian dan menginput nilai ke dalam *Rapor Sementara*.

Terima kasih,
Admin SMP YPS SINGKOLE`;

    // Send WhatsApp message
    const message = await client.messages.create({
      body: messageText,
      from: fromWhatsAppNumber,
      to: toWhatsAppNumber,
    });

    // Log the reminder
    await db.insert(reminderLogs).values({
      id: uuidv4(),
      assignmentId: assignment.id,
      teacherId: teacher.id,
      sentAt: new Date(),
      messageSid: message.sid,
      messageContent: messageText,
      status: message.status,
    });

    console.log(`WhatsApp reminder sent successfully to ${teacher.name} (SID: ${message.sid})`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Error sending WhatsApp reminder:', error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Failed to send reminder' };
  }
};

// Function to send reminders for all ungraded assignments
export const sendAllAssignmentReminders = async () => {
  try {
    // Get all assignments that are not graded
    const ungradedAssignments = await db
      .select({
        assignment: assignments,
        teacher: users,
      })
      .from(assignments)
      .innerJoin(users, eq(assignments.teacherId, users.id))
      .leftJoin(reminderLogs, eq(assignments.id, reminderLogs.assignmentId))
      .where(isNull(reminderLogs.id)); // Only assignments without existing reminders

    const results = [];
    
    for (const { assignment } of ungradedAssignments) {
      const result = await sendAssignmentReminder(assignment.id);
      results.push({ assignmentId: assignment.id, ...result });
    }

    return results;
  } catch (error) {
    console.error('Error sending all assignment reminders:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to send reminders: ${error.message}`);
    }
    throw new Error('Failed to send reminders');
  }
};

// Function to check if it's time to send reminders (e.g., every Monday at 9 AM)
export const shouldSendReminders = (): boolean => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours();
  
  // Send reminders on Mondays at 9 AM
  return dayOfWeek === 1 && hour === 9; // Monday = 1
};