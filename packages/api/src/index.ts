// Re-export the router type so Next.js apps can do `import type { AppRouter }`.
// This is a type-only export — no Express code runs in consumers.
export type { AppRouter } from "./trpc/router";

import { createApp } from "./app";
import { env } from "./env";

const app = createApp();
const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`[api] Express server listening on port ${port}`);
  console.log(`[api] CORS origins: ${env.CORS_ORIGINS}`);
});
