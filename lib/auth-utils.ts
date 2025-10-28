import { authClient } from "@/lib/auth-client";

// Role-based access control utility functions
export const isAdmin = async (): Promise<boolean> => {
  try {
    const session = await authClient.getSession();
    return session?.user?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
};

export const isTeacher = async (): Promise<boolean> => {
  try {
    const session = await authClient.getSession();
    return session?.user?.role === 'teacher' || !session?.user?.role; // Default role is teacher
  } catch (error) {
    console.error('Error checking teacher role:', error);
    return false;
  }
};

export const hasRole = async (role: 'teacher' | 'admin'): Promise<boolean> => {
  try {
    const session = await authClient.getSession();
    return session?.user?.role === role;
  } catch (error) {
    console.error(`Error checking ${role} role:`, error);
    return false;
  }
};

// Server-side role checking function
export const getCurrentUserRole = async (): Promise<'teacher' | 'admin' | null> => {
  try {
    const session = await authClient.getSession();
    return session?.user?.role || 'teacher'; // Default to teacher if no role is specified
  } catch (error) {
    console.error('Error getting current user role:', error);
    return null;
  }
};