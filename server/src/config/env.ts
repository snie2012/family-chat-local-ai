import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default("30d"),
  OLLAMA_HOST: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  PORT: z.coerce.number().default(3000),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_DISPLAY_NAME: z.string().default("Admin"),
  BOT_DISPLAY_NAME: z.string().default("AI Assistant"),
  BOT_SYSTEM_PROMPT: z
    .string()
    .default(
      "You are a friendly AI assistant in a private family chat. Be warm, helpful, and concise."
    ),
  CLIENT_DIST_PATH: z.string().optional(),
  ALLOWED_ORIGIN: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
