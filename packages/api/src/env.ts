import { createEnv } from "@t3-oss/env-core";
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
    TEST_EMAILS: z.string().default(""),

    // Shared secret for MANUAL_UI simulator device.
    INTERNAL_API_SECRET: z.string().min(8),

    // Secret for cron endpoint authentication.
    CRON_SECRET: z.string().min(16),

    // Port for Express server.
    PORT: z.string().default("4000"),

    // CORS origins — comma-separated.
    CORS_ORIGINS: z.string().default("http://localhost:3001,http://localhost:3002"),

    // Apple Wallet (optional — only needed when generating passes).
    APPLE_WWDR_CERT_PATH: z.string().optional(),
    APPLE_SIGNER_CERT_PATH: z.string().optional(),
    APPLE_SIGNER_KEY_PATH: z.string().optional(),
    APPLE_SIGNER_KEY_PASS: z.string().optional(),
    APPLE_PASS_TYPE_ID: z.string().optional(),
    APPLE_TEAM_ID: z.string().optional(),

    // Google Wallet (optional — only needed when generating passes).
    GOOGLE_WALLET_ISSUER_ID: z.string().optional(),
    GOOGLE_WALLET_CLASS_ID: z.string().optional(),
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
