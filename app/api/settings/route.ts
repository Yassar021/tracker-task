import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth-utils';
import { updateSetting } from '@/lib/settings';

// GET handler for settings API
export async function GET() {
  try {
    // Only admin can access settings
    await requireAuth('admin');
    
    // For now, return a static list of available settings
    // In a real application, you might want to fetch from DB
    const settingsList = [
      { key: 'max_assignments_per_class_per_week', value: '2', description: 'Batas maksimal tugas per kelas per minggu' },
    ];
    
    return Response.json(settingsList);
  } catch (error) {
    console.error('Error fetching settings:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT handler for settings API
export async function PUT(request: NextRequest) {
  try {
    // Only admin can update settings
    const session = await requireAuth('admin');
    
    const body = await request.json();
    const { key, value, description } = body;
    
    // Validate required fields
    if (!key || value === undefined) {
      return Response.json({ message: 'Missing required fields: key and value' }, { status: 400 });
    }
    
    const updatedSetting = await updateSetting(key, String(value), description || null, session.id);
    
    return Response.json(updatedSetting);
  } catch (error) {
    console.error('Error updating setting:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}