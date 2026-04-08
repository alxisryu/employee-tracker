import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      role: "ADMIN" | "EMPLOYEE";
      employeeId: string | null;
    };
  }

  interface User {
    role: "ADMIN" | "EMPLOYEE";
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "EMPLOYEE";
    employeeId: string | null;
  }
}
