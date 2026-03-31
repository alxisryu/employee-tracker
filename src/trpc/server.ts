import "server-only";
import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { headers } from "next/headers";

// Server-side tRPC caller for use in React Server Components.
// Calls procedures directly without going through HTTP.
export const createServerCaller = async () => {
  const headersList = await headers();
  const ctx = await createTRPCContext({
    req: new Request("http://internal", {
      headers: headersList,
    }) as import("next/server").NextRequest,
  });
  return appRouter.createCaller(ctx);
};
