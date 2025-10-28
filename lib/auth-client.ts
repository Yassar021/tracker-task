import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
    fetchOptions: {
        // Add custom headers or options if needed
    }
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;