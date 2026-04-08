import { auth } from "~/server/auth";
import { NextResponse } from "next/server";

const ADMIN_ROUTES = ["/dashboard", "/employees", "/devices", "/simulator"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Not signed in — redirect to sign-in, preserving the intended destination
  // so NextAuth can send the user back there after a successful sign-in.
  if (!req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = req.auth.user.role;

  // Employees trying to reach admin-only routes → send to their profile.
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  // Root redirect based on role.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/dashboard" : "/profile", req.url),
    );
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|api/scan-employee|api/guest-signin|api/attendance-count|api/trpc|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
