import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "~/app/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { Nav } from "~/components/ui/Nav";

export const metadata: Metadata = {
  title: "Employee Tracker",
  description: "Office check-in portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SessionProvider>
          <TRPCReactProvider>
            <div className="flex min-h-screen flex-col">
              <Nav />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
