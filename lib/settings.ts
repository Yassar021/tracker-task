import { db } from '@/db';
import { settings } from '@/db/schema/tasks';
import { eq } from 'drizzle-orm';
import { logSettingsUpdate } from './audit';

// Function to update a setting with audit logging
export const updateSetting = async (
  key: string, 
  value: string, 
  description: string | null,
  updatedByUserId: string
) => {
  // Get current setting value for audit log
  const [currentSetting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key));

  // Update or create the setting
  const [updatedSetting] = await db
    .insert(settings)
    .values({
      key,
      value,
      description,
      updatedBy: updatedByUserId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        description,
        updatedBy: updatedByUserId,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Log the setting update
  await logSettingsUpdate(
    updatedByUserId,
    key,
    currentSetting || null,
    {
      key,
      value,
      description,
      updatedBy: updatedByUserId,
      updatedAt: updatedSetting.updatedAt,
    }
  );

  return updatedSetting;
};

// Function to get a setting value
export const getSetting = async (key: string): Promise<string | null> => {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key));
  
  return setting?.value || null;
};