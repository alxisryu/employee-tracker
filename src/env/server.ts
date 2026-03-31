import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // NextAuth
    AUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),

    // Comma-separated list of emails that get ADMIN role on first sign-in.
    ADMIN_EMAILS: z.string().default(""),

    // Comma-separated list of non-company emails allowed in non-production environments.
    // Ignored entirely when NODE_ENV=production.
    TEST_EMAILS: z.string().default(""),

    // Internal secrets (still used by the Pi REST endpoint and web simulator)
    INTERNAL_API_SECRET: z.string().min(8),

    // Secret used to authenticate calls to /api/cron/* endpoints.
    CRON_SECRET: z.string().min(16),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    TEST_EMAILS: process.env.TEST_EMAILS,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
