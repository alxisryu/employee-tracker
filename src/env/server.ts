import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    ADMIN_SECRET: z.string().min(8),
    INTERNAL_API_SECRET: z.string().min(8),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_ADMIN_SECRET: z.string().min(8),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
