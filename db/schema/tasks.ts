import { pgTable, text, integer, timestamp, boolean, date, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Enum for user roles
export const userRoleEnum = pgEnum("user_role", ["teacher", "admin"]);

// Enum for assignment types
export const assignmentTypeEnum = pgEnum("assignment_type", ["tugas", "ujian_sumatif"]);

// Enum for assignment status
export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "graded", "overdue"]);

// Extend the existing user table to include role and phone number
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
  role: userRoleEnum("role").default("teacher").notNull(), // default to teacher
  phoneNumber: text("phone_number"),
});

// Classes table
export const classes = pgTable("classes", {
  id: text("id").primaryKey().notNull(),
  grade: integer("grade").notNull(), // 7, 8, or 9
  name: text("name").notNull(), // e.g., "DISCIPLINE", "RESPECT", etc.
  teacherId: text("teacher_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Assignments table
export const assignments = pgTable("assignments", {
  id: text("id").primaryKey().notNull(),
  subject: text("subject").notNull(),
  learningGoal: text("learning_goal").notNull(),
  type: assignmentTypeEnum("type").notNull(),
  weekNumber: integer("week_number").notNull(), // Week of the year
  year: integer("year").notNull(), // Year for proper weekly tracking
  status: assignmentStatusEnum("status").default("pending").notNull(),
  assignedDate: date("assigned_date").notNull(),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Junction table to connect classes to assignments
export const classAssignments = pgTable("class_assignments", {
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Assignment status tracking (grading information)
export const assignmentStatuses = pgTable("assignment_statuses", {
  assignmentId: text("assignment_id").primaryKey().references(() => assignments.id, { onDelete: "cascade" }),
  isGraded: boolean("is_graded").default(false).notNull(),
  gradedAt: timestamp("graded_at"),
  gradeInputBy: text("grade_input_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// System settings table
export const settings = pgTable("settings", {
  key: text("key").primaryKey().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Reminder logs for WhatsApp notifications
export const reminderLogs = pgTable("reminder_logs", {
  id: text("id").primaryKey().notNull(),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").notNull(),
  messageSid: text("message_sid"), // Twilio message SID
  messageContent: text("message_content"), // The content of the message sent
  status: text("status").default("sent"), // sent, delivered, failed
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Audit logs for tracking changes
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g., "create_assignment", "update_settings", etc.
  tableName: text("table_name"), // The table affected
  recordId: text("record_id"), // The ID of the record affected
  oldValue: text("old_value"), // JSON string of previous values
  newValue: text("new_value"), // JSON string of new values
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});