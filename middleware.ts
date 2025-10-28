import { auth } from "@/lib/auth";

// Create the Next.js middleware
export default auth;

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/sign-in", "/sign-up"],
};