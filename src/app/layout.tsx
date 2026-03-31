import type { Metadata } from "next";
import "~/app/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { Nav } from "~/components/ui/Nav";

export const metadata: Metadata = {
  title: "Employee Tracker",
  description: "Office attendance and check-in system",
};

// The admin secret is sent with every tRPC request from the client.
// For MVP this is fine — in production use a session cookie or JWT.
// NEXT_PUBLIC_ vars are available at runtime in the browser bundle.
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "dev-secret-change-me";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <TRPCReactProvider adminSecret={ADMIN_SECRET}>
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
