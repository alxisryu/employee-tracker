import type { Metadata } from "next";
import { Providers } from "~/components/providers";
import { auth } from "~/server/auth";
import "~/app/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { Nav } from "~/components/ui/nav";

export const metadata: Metadata = {
  title: "Employee Tracker",
  description: "Office attendance and check-in system",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="min-h-screen overflow-y-scroll bg-background text-foreground antialiased">
        <Providers session={session}>
          <TRPCReactProvider>
            <div className="flex min-h-screen flex-col">
              <Nav />
              <main className="flex-1 py-6">{children}</main>
            </div>
          </TRPCReactProvider>
        </Providers>
      </body>
    </html>
  );
}
