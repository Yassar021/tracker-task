import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth-utils';
import { getAuditLogs } from '@/lib/audit';

// GET handler for audit logs API
export async function GET(request: NextRequest) {
  try {
    // Only admin can access audit logs
    await requireAuth('admin');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    
    // Validate limit parameter
    if (limit > 100) {
      return Response.json({ message: 'Limit cannot exceed 100' }, { status: 400 });
    }
    
    const logs = await getAuditLogs(limit, offset, userId, action as any);
    
    return Response.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}