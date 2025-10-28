import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema/tasks";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

// Server-side function to get current user with role
export async function getCurrentUser() {
  try {
    // Try to get session using better-auth's server-side method
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${cookies().get("better-auth.session_token")?.value || ""}`
      })
    });
    
    if (!session) {
      return null;
    }
    
    // Fetch user with role from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id));
    
    if (!user) {
      return null;
    }
    
    return {
      ...session.user,
      role: user.role,
      phoneNumber: user.phoneNumber,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Server-side role checking
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

export async function isTeacher() {
  const user = await getCurrentUser();
  return user?.role === 'teacher' || !user?.role; // Default role is teacher
}

export async function hasRole(role: 'teacher' | 'admin') {
  const user = await getCurrentUser();
  return user?.role === role;
}

// Server-side function for API routes
export async function requireAuth(requiredRole?: 'teacher' | 'admin') {
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: `better-auth.session_token=${cookies().get("better-auth.session_token")?.value || ""}`
    })
  });
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  if (requiredRole) {
    const user = await getCurrentUser();
    if (user?.role !== requiredRole) {
      throw new Error(`Access denied: ${requiredRole} role required`);
    }
  }
  
  return session.user;
}