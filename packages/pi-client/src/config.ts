import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from the package root.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function require(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  backendUrl: require("BACKEND_URL"),
  deviceId: require("DEVICE_ID"),
  deviceApiKey: require("DEVICE_API_KEY"),
  mockMode: process.env.MOCK_MODE === "true",
  clientDebounceMs: parseInt(process.env.CLIENT_DEBOUNCE_MS ?? "30000", 10),
};
